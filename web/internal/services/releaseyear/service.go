package releaseyear

import (
	"context"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes release year catalogue functionality.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures pagination filters for release year listings.
type ListParams struct {
	Page    int
	PerPage int
}

// ListResult packages the release year list response.
type ListResult struct {
	Data    []Year `json:"data"`
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Total   int    `json:"total"`
}

// Year represents a release year entry.
type Year struct {
	ID    int `json:"id"`
	Name  int `json:"name"`
	Total int `json:"total"`
}

// Repository abstracts release year persistence.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

type service struct {
	repo Repository
}

// NewService creates a release-year service using the supplied repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	params.Page = pagination.NormalisePage(params.Page)
	params.PerPage = pagination.NormalisePerPage(params.PerPage)

	return s.repo.List(ctx, params)
}
