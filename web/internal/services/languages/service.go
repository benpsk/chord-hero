package languages

import (
	"context"
)

// Service exposes language catalogue functionality.
type Service interface {
	List(ctx context.Context) ([]Language, error)
}

// Language represents a language entry.
type Language  struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Repository abstracts persistence for languages.
type Repository interface {
	List(ctx context.Context) ([]Language, error)
}

type service struct {
	repo Repository
}

// NewService constructs a language service using the supplied repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// List returns all available languages without pagination.
func (s *service) List(ctx context.Context) ([]Language, error) {
	return s.repo.List(ctx)
}
