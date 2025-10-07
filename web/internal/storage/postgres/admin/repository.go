package admin

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound indicates that no admin user matched the lookup criteria.
var ErrNotFound = errors.New("admin: user not found")

// Repository provides access to admin user credentials stored in Postgres.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// User encapsulates the data required to authenticate an admin user.
type User struct {
	ID           int
	Username     string
	PasswordHash string
}

// FindByUsername retrieves an admin user by their username.
func (r *Repository) FindByUsername(ctx context.Context, username string) (User, error) {
	var user User
	err := r.db.QueryRow(ctx, `
		SELECT id, username, password_hash
		FROM admin_users
		WHERE username = $1
	`, username).Scan(&user.ID, &user.Username, &user.PasswordHash)
	if err != nil {
		if err == pgx.ErrNoRows {
			return User{}, ErrNotFound
		}
		return User{}, fmt.Errorf("select admin user: %w", err)
	}
	return user, nil
}
