package releaseyear

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/services/shared"
)

// Service exposes release year catalogue functionality.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures pagination filters for release year listings.
type ListParams struct {
	Page    int
	PerPage int
}

// ListResult packages the release year list response.
type ListResult struct {
	Data    []Year `json:"data"`
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Total   int    `json:"total"`
}

// Year represents a release year entry.
type Year struct {
	ID    int `json:"id"`
	Name  int `json:"name"`
	Total int `json:"total"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService creates a release-year service using Postgres as a backend.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	page := shared.NormalisePage(params.Page)
	perPage := shared.NormalisePerPage(params.PerPage)

	result := ListResult{
		Data:    []Year{},
		Page:    page,
		PerPage: perPage,
	}

	countQuery := `
        WITH song_years AS (
            SELECT DISTINCT COALESCE(a.release_year, s.release_year) AS year_value
            FROM songs s
            LEFT JOIN albums a ON a.id = s.album_id
            WHERE COALESCE(a.release_year, s.release_year) IS NOT NULL
        )
        SELECT COUNT(*) FROM song_years
    `

	if err := s.db.QueryRow(ctx, countQuery).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count release years: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	query := `
        WITH song_years AS (
            SELECT COALESCE(a.release_year, s.release_year) AS year_value
            FROM songs s
            LEFT JOIN albums a ON a.id = s.album_id
            WHERE COALESCE(a.release_year, s.release_year) IS NOT NULL
        )
        SELECT year_value, COUNT(*) AS total
        FROM song_years
        GROUP BY year_value
        ORDER BY year_value DESC
        LIMIT $1 OFFSET $2
    `

	rows, err := s.db.Query(ctx, query, perPage, shared.Offset(page, perPage))
	if err != nil {
		return result, fmt.Errorf("list release years: %w", err)
	}
	defer rows.Close()

	years := make([]Year, 0, perPage)

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
		years = append(years, Year{ID: year, Name: year, Total: total})
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate release years: %w", err)
	}

	result.Data = years
	return result, nil
}
