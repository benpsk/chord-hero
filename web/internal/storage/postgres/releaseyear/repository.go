package releaseyear

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
)

// Repository provides Postgres-backed release year queries.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List returns paginated release years with aggregated song totals.
func (r *Repository) List(ctx context.Context, params releaseyearsvc.ListParams) (releaseyearsvc.ListResult, error) {
	result := releaseyearsvc.ListResult{
		Data:    []releaseyearsvc.Year{},
		Page:    params.Page,
		PerPage: params.PerPage,
	}

	countQuery := `
        WITH song_years AS (
            SELECT DISTINCT COALESCE(a.release_year, s.release_year) AS year_value
            FROM songs s
            LEFT JOIN album_song als ON als.song_id = s.id
            LEFT JOIN albums a ON als.album_id = a.id
            WHERE COALESCE(a.release_year, s.release_year) IS NOT NULL
        )
        SELECT COUNT(*) FROM song_years
    `

	if err := r.db.QueryRow(ctx, countQuery).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count release years: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	query := `
        WITH song_years AS (
            SELECT COALESCE(a.release_year, s.release_year) AS year_value
            FROM songs s
            LEFT JOIN album_song als ON als.song_id = s.id
            LEFT JOIN albums a ON als.album_id = a.id
            WHERE COALESCE(a.release_year, s.release_year) IS NOT NULL
        )
        SELECT year_value, COUNT(*) AS total
        FROM song_years
        GROUP BY year_value
        ORDER BY year_value DESC
        LIMIT $1 OFFSET $2
    `

	rows, err := r.db.Query(ctx, query, params.PerPage, offset(params.Page, params.PerPage))
	if err != nil {
		return result, fmt.Errorf("list release years: %w", err)
	}
	defer rows.Close()

	years := make([]releaseyearsvc.Year, 0, params.PerPage)

	for rows.Next() {
		var (
			yearValue sql.NullInt32
			total     int
		)

		if err := rows.Scan(&yearValue, &total); err != nil {
			return result, fmt.Errorf("scan release year: %w", err)
		}

		if !yearValue.Valid {
			continue
		}

		year := int(yearValue.Int32)
		years = append(years, releaseyearsvc.Year{ID: year, Name: year, Total: total})
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate release years: %w", err)
	}

	result.Data = years
	return result, nil
}

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
