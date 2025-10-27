package releaseyear

import (
	"context"
	"database/sql"
	"fmt"

	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed release year queries.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
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
        with song_years as (
            select distinct coalesce(a.release_year, s.release_year) as year_value
            from songs s
            left join album_song als on als.song_id = s.id
            left join albums a on als.album_id = a.id
            where coalesce(a.release_year, s.release_year) is not null
        )
        select count(*) from song_years
    `

	if err := r.db.QueryRow(ctx, countQuery).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count release years: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	query := `
        with song_years as (
            select coalesce(a.release_year, s.release_year) as year_value
            from songs s
            left join album_song als on als.song_id = s.id
            left join albums a on als.album_id = a.id
            where coalesce(a.release_year, s.release_year) is not null
        )
        select year_value, count(*) as total
        from song_years
        group by year_value
        order by year_value desc
        limit $1 offset $2
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
