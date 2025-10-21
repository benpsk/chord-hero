package login

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	loginsvc "github.com/lyricapp/lyric/web/internal/services/login"
)

// Repository persists login OTP flows.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// FindOrCreateUser fetches an existing user or creates one on demand.
func (r *Repository) FindOrCreateUser(ctx context.Context, email string) (loginsvc.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	var user loginsvc.User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, role
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.Role)
	if err == nil {
		return user, nil
	}

	if err != pgx.ErrNoRows {
		return loginsvc.User{}, fmt.Errorf("select user: %w", err)
	}

	err = r.db.QueryRow(ctx, `
		INSERT INTO users (email, role)
		VALUES ($1, 'user')
		ON CONFLICT (email) DO UPDATE
		SET updated_at = NOW()
		RETURNING id, email, role
	`, email).Scan(&user.ID, &user.Email, &user.Role)
	if err != nil {
		return loginsvc.User{}, fmt.Errorf("insert user: %w", err)
	}

	return user, nil
}

// CreateLoginCode stores a fresh OTP for the supplied user, replacing older codes.
func (r *Repository) CreateLoginCode(ctx context.Context, userID int, code string, expiresAt time.Time) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin login code tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, `DELETE FROM user_login_codes WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("delete previous login codes: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_login_codes (user_id, code, expires_at)
		VALUES ($1, $2, $3)
	`, userID, code, expiresAt); err != nil {
		return fmt.Errorf("insert login code: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit login code tx: %w", err)
	}

	return nil
}

// ConsumeLoginCode marks the provided code as used when valid and returns the associated user.
func (r *Repository) ConsumeLoginCode(ctx context.Context, code string, attemptedAt time.Time) (loginsvc.User, bool, error) {
	code = strings.TrimSpace(code)

	var userID int
	err := r.db.QueryRow(ctx, `
		UPDATE user_login_codes
		SET used_at = $3
		WHERE code = $1
		  AND used_at IS NULL
		  AND expires_at >= $2
		RETURNING user_id
	`, code, attemptedAt, attemptedAt).Scan(&userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return loginsvc.User{}, false, nil
		}
		return loginsvc.User{}, false, fmt.Errorf("consume login code: %w", err)
	}

	var user loginsvc.User
	if err := r.db.QueryRow(ctx, `
		SELECT id, email, role
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Role); err != nil {
		return loginsvc.User{}, false, fmt.Errorf("select user by id: %w", err)
	}

	return user, true, nil
}

// FindUserByID returns a user by their identifier.
func (r *Repository) FindUserByID(ctx context.Context, userID int) (loginsvc.User, error) {
	var user loginsvc.User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, role
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Role)
	if err != nil {
		if err == pgx.ErrNoRows {
			return loginsvc.User{}, fmt.Errorf("user not found")
		}
		return loginsvc.User{}, fmt.Errorf("select user by id: %w", err)
	}
	return user, nil
}
