package users

import (
	"context"
	"errors"
	"strings"
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

var (
	// ErrEmailRequired indicates email parameter is missing.
	ErrEmailRequired = errors.New("users: email is required")
	// ErrEmailTooShort indicates the search term is too short to be useful.
	ErrEmailTooShort = errors.New("users: email must be at least 3 characters")
)

// SearchByEmail returns a list of users matching the provided email fragment.
func (s *service) SearchByEmail(ctx context.Context, email string) ([]User, error) {
	query := strings.TrimSpace(email)
	if query == "" {
		return nil, ErrEmailRequired
	}
	return s.repo.SearchByEmail(ctx, query)
}
