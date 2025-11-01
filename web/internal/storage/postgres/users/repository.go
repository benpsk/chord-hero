package users

import (
	"context"
	"fmt"

	usersvc "github.com/lyricapp/lyric/web/internal/services/users"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed user queries.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
	return &Repository{db: db}
}

// List returns all users.
func (r *Repository) List(ctx context.Context) ([]usersvc.User, error) {
	query := `
		select id, email, role
		from users
		order by id asc
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []usersvc.User
	for rows.Next() {
		var user usersvc.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Role); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}

	return users, nil
}

// SearchByEmail returns all users.
func (r *Repository) SearchByEmail(ctx context.Context, email string) ([]usersvc.User, error) {
	query := `
		select id, email, role
		from users
		where email ilike $1
		order by id asc
	`

	rows, err := r.db.Query(ctx, query, "%"+email+"%")
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []usersvc.User
	for rows.Next() {
		var user usersvc.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Role); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}

	return users, nil
}