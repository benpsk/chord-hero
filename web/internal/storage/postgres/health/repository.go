package health

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository provides a Postgres-backed health check.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Ping verifies the database connection is healthy.
func (r *Repository) Ping(ctx context.Context) error {
	if r.db == nil {
		return nil
	}
	return r.db.Ping(ctx)
}
