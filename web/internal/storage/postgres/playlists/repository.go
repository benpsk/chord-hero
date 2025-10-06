package playlists

import (
	"context"
	"fmt"
	"strings"

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

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
