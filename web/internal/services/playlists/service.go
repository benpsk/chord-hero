package playlists

import (
	"context"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes playlist catalogue operations.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams collects filtering options for listing playlists.
type ListParams struct {
	Page    int
	PerPage int
	Search  string
	UserID  *int
}

// ListResult represents the paginated playlist payload.
type ListResult struct {
	Data    []Playlist `json:"data"`
	Page    int        `json:"page"`
	PerPage int        `json:"per_page"`
	Total   int        `json:"total"`
}

// Playlist describes a playlist row for API consumers.
type Playlist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

// Repository abstracts playlist persistence operations.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

type service struct {
	repo Repository
}

// NewService builds a playlist service backed by a repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	params.Page = pagination.NormalisePage(params.Page)
	params.PerPage = pagination.NormalisePerPage(params.PerPage)

	return s.repo.List(ctx, params)
}
