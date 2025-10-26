package adminauth

import (
	"context"
	"strings"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"golang.org/x/crypto/bcrypt"
)

// AdminUser represents the authenticated admin principal.
type AdminUser struct {
	ID       int
	Username string
}

type User struct {
	ID           int
	Username     string
	PasswordHash string
}

// Credential carries the stored password hash needed to authenticate.
type Credential struct {
	ID           int
	Username     string
	PasswordHash string
}

// Repository exposes credential lookup methods required for authentication.
type Repository interface {
	FindByUsername(ctx context.Context, username string) (User, error)
}

// Service defines admin authentication behaviours.
type Service interface {
	Authenticate(ctx context.Context, username, password string) (AdminUser, error)
	FindByUsername(ctx context.Context, username string) (Credential, error)
}

type service struct {
	repo Repository
}

// NewService constructs a Service using the provided repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Authenticate(ctx context.Context, username, password string) (AdminUser, error) {
	trimmedUser := strings.TrimSpace(username)
	if trimmedUser == "" || strings.TrimSpace(password) == "" {
		return AdminUser{}, apperror.BadRequest("invalid user")
	}

	credential, err := s.repo.FindByUsername(ctx, trimmedUser)
	if err != nil {
		return AdminUser{}, apperror.BadRequest("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(credential.PasswordHash), []byte(password)); err != nil {
		return AdminUser{}, apperror.BadRequest("invalid credentials")
	}

	return AdminUser{ID: credential.ID, Username: credential.Username}, nil
}


func (s *service) FindByUsername(ctx context.Context, username string) (Credential, error) {
	user, err := s.repo.FindByUsername(ctx, username)
	if err != nil {
		return Credential{}, err
	}
	return Credential{
		ID:           user.ID,
		Username:     user.Username,
		PasswordHash: user.PasswordHash,
	}, nil
}
