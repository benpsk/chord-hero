package artists

import (
	"context"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service describes artist catalogue capabilities.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures query string filters for artists.
type ListParams struct {
	Page    int
	PerPage int
	Search  string
}

// ListResult packages a paginated artist collection.
type ListResult struct {
	Data    []Artist `json:"data"`
	Page    int      `json:"page"`
	PerPage int      `json:"per_page"`
	Total   int      `json:"total"`
}

// Artist represents the API payload for an artist list item.
type Artist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

// Repository encapsulates artist persistence concerns.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

type service struct {
	repo Repository
}

// NewService wires a repository into a concrete artist service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	params.Page = pagination.NormalisePage(params.Page)
	params.PerPage = pagination.NormalisePerPage(params.PerPage)

	return s.repo.List(ctx, params)
}
