package playlists

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgxpool"

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

	if params.UserID != nil {
		argPos++
		conditions = append(conditions, fmt.Sprintf("p.user_id = $%d", argPos))
		args = append(args, *params.UserID)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM playlists p" + whereClause
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count playlists: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        WITH playlist_totals AS (
            SELECT ps.playlist_id, COUNT(ps.song_id) AS total_songs
            FROM playlist_song ps
            GROUP BY ps.playlist_id
        )
        SELECT p.id, p.name, COALESCE(pt.total_songs, 0) AS total_songs
        FROM playlists p
        LEFT JOIN playlist_totals pt ON pt.playlist_id = p.id
        %s
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT %s OFFSET %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, params.PerPage, offset(params.Page, params.PerPage))

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list playlists: %w", err)
	}
	defer rows.Close()

	playlists := make([]playlistsvc.Playlist, 0, params.PerPage)

	for rows.Next() {
		var playlist playlistsvc.Playlist
		if err := rows.Scan(&playlist.ID, &playlist.Name, &playlist.Total); err != nil {
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
        INSERT INTO playlists (name, user_id)
        VALUES ($1, $2)
        RETURNING id
    `, params.Name, params.UserID).Scan(&playlistID); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return 0, playlistsvc.ErrInvalidUser
		}
		return 0, fmt.Errorf("create playlist: %w", err)
	}

	return playlistID, nil
}

// AddSongs associates songs with the provided playlist.
func (r *Repository) AddSongs(ctx context.Context, playlistID int, songIDs []int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin add songs to playlist: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	for _, songID := range songIDs {
		if _, err := tx.Exec(ctx, `
            INSERT INTO playlist_song (playlist_id, song_id)
            VALUES ($1, $2)
            ON CONFLICT (playlist_id, song_id) DO UPDATE
            SET updated_at = NOW()
        `, playlistID, songID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				switch pgErr.ConstraintName {
				case "playlist_song_playlist_id_fkey":
					return playlistsvc.ErrPlaylistNotFound
				case "playlist_song_song_id_fkey":
					return playlistsvc.ErrSongNotFound
				}
				return playlistsvc.ErrSongNotFound
			}
			return fmt.Errorf("add songs to playlist: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit add songs to playlist: %w", err)
	}

	return nil
}

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
