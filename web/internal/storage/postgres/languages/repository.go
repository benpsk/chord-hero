package languages

import (
	"context"
	"fmt"

	languagesvc "github.com/lyricapp/lyric/web/internal/services/languages"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed language lookups.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a language repository instance.
func NewRepository(db storage.Querier) *Repository {
	return &Repository{db: db}
}

// List retrieves all languages ordered by name.
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
			return nil, fmt.Errorf("scan language: %w", err)
		}
		languages = append(languages, language)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate languages: %w", err)
	}

	return languages, nil
}
