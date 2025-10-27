package users

import (
	"context"
	"fmt"
	"strings"

	usersvc "github.com/lyricapp/lyric/web/internal/services/users"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed user lookups.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
	return &Repository{db: db}
}

// SearchByEmail finds users whose email matches the provided fragment.
func (r *Repository) SearchByEmail(ctx context.Context, email string) ([]usersvc.User, error) {
	query := strings.TrimSpace(email)
	rows, err := r.db.Query(ctx, `
        select id, email
        from users
        where email ILIKE $1
        order by email asc
        limit 20
    `, "%"+query+"%")
	if err != nil {
		return nil, fmt.Errorf("search users by email: %w", err)
	}
	defer rows.Close()

	results := make([]usersvc.User, 0, 20)
	for rows.Next() {
		var user usersvc.User
		if err := rows.Scan(&user.ID, &user.Email); err != nil {
			return nil, fmt.Errorf("scan users: %w", err)
		}
		results = append(results, user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}

	return results, nil
}
