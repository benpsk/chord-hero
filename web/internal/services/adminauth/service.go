package adminauth

import (
	"context"
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// ErrInvalidCredentials is returned when the supplied username/password pair is invalid.
var ErrInvalidCredentials = errors.New("adminauth: invalid credentials")

// AdminUser represents the authenticated admin principal.
type AdminUser struct {
	ID       int
	Username string
}

// Credential carries the stored password hash needed to authenticate.
type Credential struct {
	ID           int
	Username     string
	PasswordHash string
}

// Repository exposes credential lookup methods required for authentication.
type Repository interface {
	FindByUsername(ctx context.Context, username string) (Credential, error)
}

// Service defines admin authentication behaviours.
type Service interface {
	Authenticate(ctx context.Context, username, password string) (AdminUser, error)
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
		return AdminUser{}, ErrInvalidCredentials
	}

	credential, err := s.repo.FindByUsername(ctx, trimmedUser)
	if err != nil {
		return AdminUser{}, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(credential.PasswordHash), []byte(password)); err != nil {
		return AdminUser{}, ErrInvalidCredentials
	}

	return AdminUser{ID: credential.ID, Username: credential.Username}, nil
}
