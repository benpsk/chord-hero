package writers

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/services/shared"
)

// Service describes writer catalogue capabilities.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures query string filters for writers.
type ListParams struct {
	Page    int
	PerPage int
	Search  string
}

// ListResult packages a paginated writer collection.
type ListResult struct {
	Data    []Writer `json:"data"`
	Page    int      `json:"page"`
	PerPage int      `json:"per_page"`
	Total   int      `json:"total"`
}

// Writer represents the API payload for a writer list item.
type Writer struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService wires the database into a concrete writer service.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	page := shared.NormalisePage(params.Page)
	perPage := shared.NormalisePerPage(params.PerPage)

	result := ListResult{
		Data:    []Writer{},
		Page:    page,
		PerPage: perPage,
	}

	conditions := make([]string, 0)
	args := make([]any, 0)
	argPos := 0

	search := strings.TrimSpace(params.Search)
	if search != "" {
		argPos++
		conditions = append(conditions, fmt.Sprintf("w.name ILIKE $%d", argPos))
		args = append(args, "%"+search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM writers w" + whereClause
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count writers: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        WITH writer_totals AS (
            SELECT sw.writer_id, COUNT(DISTINCT sw.song_id) AS total_songs
            FROM song_writer sw
            GROUP BY sw.writer_id
        )
        SELECT w.id, w.name, COALESCE(wt.total_songs, 0) AS total_songs
        FROM writers w
        LEFT JOIN writer_totals wt ON wt.writer_id = w.id
        %s
        ORDER BY w.name ASC
        LIMIT %s OFFSET %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, perPage, shared.Offset(page, perPage))

	rows, err := s.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list writers: %w", err)
	}
	defer rows.Close()

	writers := make([]Writer, 0, perPage)

	for rows.Next() {
		var writer Writer
		if err := rows.Scan(&writer.ID, &writer.Name, &writer.Total); err != nil {
			return result, fmt.Errorf("scan writer: %w", err)
		}
		writers = append(writers, writer)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate writers: %w", err)
	}

	result.Data = writers
	return result, nil
}
