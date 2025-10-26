package admin

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lyricapp/lyric/web/internal/apperror"
	adminauthsvc "github.com/lyricapp/lyric/web/internal/services/adminauth"
)

// Repository provides access to admin user credentials stored in Postgres.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// User encapsulates the data required to authenticate an admin user.

// FindByUsername retrieves an admin user by their username.
func (r *Repository) FindByUsername(ctx context.Context, username string) (adminauthsvc.User, error) {
	var user adminauthsvc.User
	err := r.db.QueryRow(ctx, `
		SELECT id, username, password_hash
		FROM admin_users
		WHERE username = $1
	`, username).Scan(&user.ID, &user.Username, &user.PasswordHash)
	if err != nil {
		if err == pgx.ErrNoRows {
			return adminauthsvc.User{}, apperror.NotFound("user not found")
		}
		return adminauthsvc.User{}, fmt.Errorf("select admin user: %w", err)
	}
	return user, nil
}

