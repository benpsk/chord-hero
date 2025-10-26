package writers

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
)

// Repository provides Postgres-backed writer data access.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List retrieves writers per the supplied filters.
func (r *Repository) List(ctx context.Context, params writersvc.ListParams) (writersvc.ListResult, error) {
	result := writersvc.ListResult{
		Data:    []writersvc.Writer{},
		Page:    params.Page,
		PerPage: params.PerPage,
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

	countQuery := "select count(*) from writers w" + whereClause
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count writers: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        with writer_totals as (
            select sw.writer_id, count(distinct sw.song_id) as total_songs
            from song_writer sw
            group by sw.writer_id
        )
        select w.id, w.name, coalesce(wt.total_songs, 0) as total_songs
        from writers w
        left join writer_totals wt on wt.writer_id = w.id
        %s
        order by w.name asc
        limit %s offset %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, params.PerPage, offset(params.Page, params.PerPage))

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list writers: %w", err)
	}
	defer rows.Close()

	writers := make([]writersvc.Writer, 0, params.PerPage)

	for rows.Next() {
		var writer writersvc.Writer
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

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
