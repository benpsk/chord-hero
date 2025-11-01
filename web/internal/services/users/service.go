package users

import (
	"context"
)

// Service exposes user related functionality.
type Service interface {
	List(ctx context.Context) ([]User, error)
	SearchByEmail(ctx context.Context, email string) ([]User, error)
}

// User represents a user entry.
type User struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// Repository abstracts persistence for users.
type Repository interface {
	List(ctx context.Context) ([]User, error)
	SearchByEmail(ctx context.Context, email string) ([]User, error)
}

type service struct {
	repo Repository
}

// NewService constructs a user service using the supplied repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// List returns all available users without pagination.
func (s *service) List(ctx context.Context) ([]User, error) {
	return s.repo.List(ctx)
}

// SearchByEmail returns all available users without pagination.
func (s *service) SearchByEmail(ctx context.Context, email string) ([]User, error) {
	return s.repo.SearchByEmail(ctx, email)
}