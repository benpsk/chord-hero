package languages

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	languagesvc "github.com/lyricapp/lyric/web/internal/services/languages"
)

// Repository provides Postgres-backed level lookups.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a level repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List retrieves all levels ordered by name.
func (r *Repository) List(ctx context.Context) ([]languagesvc.Language, error) {
	rows, err := r.db.Query(ctx, `
        select id, name
        from languages
        order by name asc
    `)
	if err != nil {
		return nil, fmt.Errorf("list language: %w", err)
	}
	defer rows.Close()

	languages := make([]languagesvc.Language, 0)

	for rows.Next() {
		var language languagesvc.Language
		if err := rows.Scan(&language.ID, &language.Name); err != nil {
			return nil, fmt.Errorf("scan level: %w", err)
		}
		languages = append(languages, language)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate levels: %w", err)
	}

	return languages, nil
}
