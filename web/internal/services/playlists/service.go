package playlists

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/services/shared"
)

// Service exposes playlist catalogue operations.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams collects filtering options for listing playlists.
type ListParams struct {
	Page    int
	PerPage int
	Search  string
	UserID  *int
}

// ListResult represents the paginated playlist payload.
type ListResult struct {
	Data    []Playlist `json:"data"`
	Page    int        `json:"page"`
	PerPage int        `json:"per_page"`
	Total   int        `json:"total"`
}

// Playlist describes a playlist row for API consumers.
type Playlist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService builds a playlist service backed by Postgres.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	page := shared.NormalisePage(params.Page)
	perPage := shared.NormalisePerPage(params.PerPage)

	result := ListResult{
		Data:    []Playlist{},
		Page:    page,
		PerPage: perPage,
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
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
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
	listArgs = append(listArgs, perPage, shared.Offset(page, perPage))

	rows, err := s.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list playlists: %w", err)
	}
	defer rows.Close()

	playlists := make([]Playlist, 0, perPage)

	for rows.Next() {
		var playlist Playlist
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
