package artists

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/services/shared"
)

// Service describes artist catalogue capabilities.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures query string filters for artists.
type ListParams struct {
	Page    int
	PerPage int
	Search  string
}

// ListResult packages a paginated artist collection.
type ListResult struct {
	Data    []Artist `json:"data"`
	Page    int      `json:"page"`
	PerPage int      `json:"per_page"`
	Total   int      `json:"total"`
}

// Artist represents the API payload for an artist list item.
type Artist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService wires the database into a concrete artist service.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	page := shared.NormalisePage(params.Page)
	perPage := shared.NormalisePerPage(params.PerPage)

	result := ListResult{
		Data:    []Artist{},
		Page:    page,
		PerPage: perPage,
	}

	conditions := make([]string, 0)
	args := make([]any, 0)
	argPos := 0

	search := strings.TrimSpace(params.Search)
	if search != "" {
		argPos++
		conditions = append(conditions, fmt.Sprintf("ar.name ILIKE $%d", argPos))
		args = append(args, "%"+search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM artists ar" + whereClause
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count artists: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        WITH artist_totals AS (
            SELECT sa.artist_id, COUNT(DISTINCT sa.song_id) AS total_songs
            FROM artist_song sa
            GROUP BY sa.artist_id
        )
        SELECT ar.id, ar.name, COALESCE(at.total_songs, 0) AS total_songs
        FROM artists ar
        LEFT JOIN artist_totals at ON at.artist_id = ar.id
        %s
        ORDER BY ar.name ASC
        LIMIT %s OFFSET %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, perPage, shared.Offset(page, perPage))

	rows, err := s.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list artists: %w", err)
	}
	defer rows.Close()

	artists := make([]Artist, 0, perPage)

	for rows.Next() {
		var artist Artist
		if err := rows.Scan(&artist.ID, &artist.Name, &artist.Total); err != nil {
			return result, fmt.Errorf("scan artist: %w", err)
		}
		artists = append(artists, artist)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate artists: %w", err)
	}

	result.Data = artists
	return result, nil
}
