package users

import (
	"context"
	"strings"

	"github.com/lyricapp/lyric/web/internal/apperror"
)

// Service exposes user directory search capabilities.
type Service interface {
	SearchByEmail(ctx context.Context, email string) ([]User, error)
}

// Repository abstracts user persistence operations.
type Repository interface {
	SearchByEmail(ctx context.Context, email string) ([]User, error)
}

// User represents a simplified user record for API consumers.
type User struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
}

type service struct {
	repo Repository
}

// NewService wires the repository into a domain service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// SearchByEmail returns a list of users matching the provided email fragment.
func (s *service) SearchByEmail(ctx context.Context, email string) ([]User, error) {
	query := strings.TrimSpace(email)
	if query == "" {
		return nil, apperror.BadRequest("email is required")
	}
	return s.repo.SearchByEmail(ctx, query)
}
