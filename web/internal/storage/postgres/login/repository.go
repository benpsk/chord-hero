package login

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/lyricapp/lyric/web/internal/apperror"
	loginsvc "github.com/lyricapp/lyric/web/internal/services/login"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository persists login OTP flows.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
	return &Repository{db: db}
}

// FindOrCreateUser fetches an existing user or creates one on demand.
func (r *Repository) FindOrCreateUser(ctx context.Context, email string) (loginsvc.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	var user loginsvc.User
	selectQuery := `
		SELECT id, email, role, status
		FROM users
		WHERE email = $1
	`
	err := r.db.QueryRow(ctx, selectQuery, email).Scan(&user.ID, &user.Email, &user.Role, &user.Status)
	if err == nil {
		return user, nil
	}
	if err != pgx.ErrNoRows {
		return loginsvc.User{}, fmt.Errorf("find user: %w", err)
	}
	insertQuery := `
		INSERT INTO users (email, role, status)
		VALUES ($1, 'musician', 'active')
		RETURNING id, email, role, status
	`
	err = r.db.QueryRow(ctx, insertQuery, email).Scan(&user.ID, &user.Email, &user.Role, &user.Status)
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

	if _, err := tx.Exec(ctx, `delete from user_login_codes where user_id = $1`, userID); err != nil {
		return fmt.Errorf("delete previous login codes: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into user_login_codes (user_id, code, expires_at)
		values ($1, $2, $3)
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

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return loginsvc.User{}, false, fmt.Errorf("begin consume login code tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var user loginsvc.User
	err = tx.QueryRow(ctx, `
		select u.id, u.email, u.role, u.status
		from user_login_codes ulc
		join users u on u.id = ulc.user_id
		where ulc.code = $1
		  and ulc.used_at is null
		  and ulc.expires_at >= $2
		for update
	`, code, attemptedAt).Scan(&user.ID, &user.Email, &user.Role, &user.Status)
	if err != nil {
		if err == pgx.ErrNoRows {
			return loginsvc.User{}, false, apperror.Validation("msg", map[string]string{"code": "invalid code"})
		}
		return loginsvc.User{}, false, fmt.Errorf("select login code: %w", err)
	}

	if !strings.EqualFold(strings.TrimSpace(user.Status), "active") {
		return loginsvc.User{}, false, apperror.Forbidden("account is not active")
	}

	tag, err := tx.Exec(ctx, `
		update user_login_codes
		set used_at = $3
		where code = $1
		  and used_at is null
		  and expires_at >= $2
	`, code, attemptedAt, attemptedAt)
	if err != nil {
		return loginsvc.User{}, false, fmt.Errorf("consume login code: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return loginsvc.User{}, false, apperror.Validation("msg", map[string]string{"code": "invalid code"})
	}

	if err := tx.Commit(ctx); err != nil {
		return loginsvc.User{}, false, fmt.Errorf("commit consume login code tx: %w", err)
	}

	return user, true, nil
}

// FindUserByID returns a user by their identifier.
func (r *Repository) FindUserByID(ctx context.Context, userID int) (loginsvc.User, error) {
	var user loginsvc.User
	err := r.db.QueryRow(ctx, `
		select id, email, role, status
		from users
		where id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Role, &user.Status)
	if err != nil {
		if err == pgx.ErrNoRows {
			return loginsvc.User{}, apperror.NotFound("user not found")
		}
		return loginsvc.User{}, fmt.Errorf("select user by id: %w", err)
	}

	return user, nil
}

// UpdateUserStatus modifies the status for the specified user.
func (r *Repository) UpdateUserStatus(ctx context.Context, userID int, status string) error {
	cmdTag, err := r.db.Exec(ctx, `
		update users
		set status = $1
		where id = $2
	`, strings.TrimSpace(status), userID)
	if err != nil {
		return fmt.Errorf("update user status: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("user not found")
	}
	return nil
}
