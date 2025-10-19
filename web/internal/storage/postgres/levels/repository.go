package levels

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
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
func (r *Repository) List(ctx context.Context) ([]levelsvc.Level, error) {
	rows, err := r.db.Query(ctx, `
        SELECT id, name
        FROM levels
        ORDER BY name ASC
    `)
	if err != nil {
		return nil, fmt.Errorf("list levels: %w", err)
	}
	defer rows.Close()

	levels := make([]levelsvc.Level, 0)

	for rows.Next() {
		var level levelsvc.Level
		if err := rows.Scan(&level.ID, &level.Name); err != nil {
			return nil, fmt.Errorf("scan level: %w", err)
		}
		levels = append(levels, level)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate levels: %w", err)
	}

	return levels, nil
}
