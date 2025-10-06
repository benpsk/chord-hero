package writers

import (
	"context"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service describes writer catalogue capabilities.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures query string filters for writers.
type ListParams struct {
	Page    int
	PerPage int
	Search  string
}

// ListResult packages a paginated writer collection.
type ListResult struct {
	Data    []Writer `json:"data"`
	Page    int      `json:"page"`
	PerPage int      `json:"per_page"`
	Total   int      `json:"total"`
}

// Writer represents the API payload for a writer list item.
type Writer struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

// Repository abstracts persistence for writers.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

type service struct {
	repo Repository
}

// NewService wires the database-backed repository into the service layer.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	params.Page = pagination.NormalisePage(params.Page)
	params.PerPage = pagination.NormalisePerPage(params.PerPage)

	return s.repo.List(ctx, params)
}
