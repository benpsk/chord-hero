package playlists

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/apperror"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
)

// Repository provides Postgres-backed playlist data access.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List retrieves playlists per the provided filters.
func (r *Repository) List(ctx context.Context, params playlistsvc.ListParams) (playlistsvc.ListResult, error) {
	result := playlistsvc.ListResult{
		Data:    []playlistsvc.Playlist{},
		Page:    params.Page,
		PerPage: params.PerPage,
	}

	conditions := make([]string, 0)
	args := make([]any, 0)
	argPos := 0

	search := strings.TrimSpace(params.Search)
	if search != "" {
		argPos++
		conditions = append(conditions, fmt.Sprintf("p.name ILIKE $%d", argPos))
		args = append(args, "%"+search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = strings.Join(conditions, " AND ")
	}

	countQuery := `
			select count(distinct p.id)
			from playlists p
			left join playlist_user pu
				on pu.playlist_id = p.id
				and pu.user_id = $1
			where (p.user_id = $1 or pu.user_id = $1)
		` + whereClause
	searchArgs := append([]any{}, *params.UserID)
	searchArgs = append(searchArgs, args...)
	if err := r.db.QueryRow(ctx, countQuery, searchArgs...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count playlists: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+2)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+3)

	listQuery := fmt.Sprintf(`
			with playlist_totals as (
				select ps.playlist_id, count(ps.song_id) as total_songs
				from playlist_song ps
				group by ps.playlist_id
			)
			select p.id, p.name, coalesce(pt.total_songs, 0) as total_songs, (p.user_id = $1) as is_owner,
				case
					when p.user_id = $1 then coalesce((
						select jsonb_agg(
								jsonb_build_object('id', u.id, 'email', u.email)
								order by u.id
							)
						from playlist_user pu2
						join users u on u.id = pu2.user_id
						where pu2.playlist_id = p.id
					), '[]'::jsonb)
					else '[]'::jsonb
				end as shared_with
			from playlists p
			left join playlist_totals pt on pt.playlist_id = p.id
			left join playlist_user pu
				on pu.playlist_id = p.id
				and pu.user_id = $1
			where (p.user_id = $1 or pu.user_id = $1)
				%s
			group by p.id, p.name, p.user_id, total_songs
			order by p.id desc
			limit %s offset %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, *params.UserID)
	listArgs = append(listArgs, params.PerPage, offset(params.Page, params.PerPage))
	log.Println(listQuery)

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list playlists: %w", err)
	}
	defer rows.Close()

	playlists := make([]playlistsvc.Playlist, 0, params.PerPage)

	for rows.Next() {
		var playlist playlistsvc.Playlist
		if err := rows.Scan(&playlist.ID, &playlist.Name, &playlist.Total, &playlist.IsOwner, &playlist.SharedWith); err != nil {
			return result, fmt.Errorf("scan playlist: %w", err)
		}
		playlists = append(playlists, playlist)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate playlists: %w", err)
	}

	result.Data = playlists
	return result, nil
}

// Create stores a new playlist record.
func (r *Repository) Create(ctx context.Context, params playlistsvc.CreateParams) (int, error) {
	var playlistID int
	if err := r.db.QueryRow(ctx, `
        insert into playlists (name, user_id)
        values ($1, $2)
        returning id
    `, params.Name, params.UserID).Scan(&playlistID); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return 0, apperror.BadRequest("invalid user_id")
		}
	}
	return playlistID, nil
}

// AddSongs associates songs with the provided playlist.
func (r *Repository) AddSongs(ctx context.Context, userID int, playlistID int, songIDs []int) error {

	var exists bool
	if err := r.db.QueryRow(ctx, `
		select exists(
				select 1 from playlists where id = $1 and user_id = $2
		)
		`, playlistID, userID).Scan(&exists); err != nil {
		return fmt.Errorf("check playlist ownership: %w", err)
	}
	if !exists {
		return fmt.Errorf("unauthorized error")
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin add songs to playlist: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	for _, songID := range songIDs {
		if _, err := tx.Exec(ctx, `
            insert into playlist_song (playlist_id, song_id)
            values ($1, $2)
            on conflict (playlist_id, song_id) do update
            set updated_at = now()
        `, playlistID, songID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return apperror.BadRequest("invalid playlist_id or song_id")
			}
			return fmt.Errorf("add songs to playlist: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit add songs to playlist: %w", err)
	}

	return nil
}

// Update mutates a playlist name for the owner.
func (r *Repository) Update(ctx context.Context, id int, params playlistsvc.UpdateParams) error {
	cmdTag, err := r.db.Exec(ctx, `
        update playlists
        set name = $1
				where id = $2 and user_id = $3
    `, params.Name, id, params.UserID)
	if err != nil {
		return fmt.Errorf("update playlist: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("playlist not found")
	}
	return nil
}

// Delete removes a playlist for the provided owner.
func (r *Repository) Delete(ctx context.Context, id int, userID int) error {
	cmdTag, err := r.db.Exec(ctx, `
        delete from playlists
        where id = $1 and user_id = $2
    `, id, userID)
	if err != nil {
		return fmt.Errorf("delete playlist: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("playlist not found")
	}
	return nil
}

// RemoveSongs detaches songs from a playlist owned by the user.
func (r *Repository) RemoveSongs(ctx context.Context, playlistID int, userID int, songIDs []int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin remove songs from playlist: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var exists bool
	if err := tx.QueryRow(ctx, `
        select exists(
            select 1
            from playlists
            where id = $1 and user_id = $2
        )
    `, playlistID, userID).Scan(&exists); err != nil {
		return fmt.Errorf("check playlist ownership: %w", err)
	}
	if !exists {
		return apperror.NotFound("playlist not found")
	}

	for _, songID := range songIDs {
		if _, err := tx.Exec(ctx, `
            delete from playlist_song
            where playlist_id = $1 and song_id = $2
        `, playlistID, songID); err != nil {
			return fmt.Errorf("remove song %d from playlist: %w", songID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit remove songs from playlist: %w", err)
	}

	return nil
}

// Share synchronises playlist sharing relationships.
func (r *Repository) Share(ctx context.Context, playlistID int, ownerID int, userIDs []int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin share playlist: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var isOwner bool
	if err := tx.QueryRow(ctx, `
        select exists(
            select 1
            from playlists
            where id = $1 and user_id = $2
        )
    `, playlistID, ownerID).Scan(&isOwner); err != nil {
		return fmt.Errorf("verify playlist owner: %w", err)
	}
	if !isOwner {
		return apperror.NotFound("playlist not found")
	}

	desired := make(map[int]struct{}, len(userIDs))
	for _, id := range userIDs {
		desired[id] = struct{}{}
	}

	if _, err := tx.Exec(ctx, `
		delete from playlist_user
		where playlist_id = $1
	`, playlistID); err != nil {
		return fmt.Errorf("remove shared user: %w", err)
	}

	for id := range desired {
		if _, err := tx.Exec(ctx, `
            insert into playlist_user (playlist_id, user_id)
            values ($1, $2)
        `, playlistID, id); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return apperror.BadRequest("invalid user_id")
			}
			return fmt.Errorf("share playlist with user %d: %w", id, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit share playlist: %w", err)
	}
	return nil
}

// Leave removes a non-owner user from a playlist.
func (r *Repository) Leave(ctx context.Context, playlistID int, userID int) error {
	cmdTag, err := r.db.Exec(ctx, `
        delete from playlist_user
        where playlist_id = $1 and user_id = $2 
    `, playlistID, userID)
	if err != nil {
		return fmt.Errorf("leave playlist: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.Unauthorized("unauthorized user")
	}

	return nil
}

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
