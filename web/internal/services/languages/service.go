package languages

import (
	"context"
)

// Service exposes level catalogue functionality.
type Service interface {
	List(ctx context.Context) ([]Language, error)
}

// Level represents a difficulty level entry.
type Language  struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Repository abstracts persistence for levels.
type Repository interface {
	List(ctx context.Context) ([]Language, error)
}

type service struct {
	repo Repository
}

// NewService constructs a level service using the supplied repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// List returns all available levels without pagination.
func (s *service) List(ctx context.Context) ([]Language, error) {
	return s.repo.List(ctx)
}
