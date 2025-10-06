package albums

import (
	"context"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes album collection behaviours to HTTP handlers.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams defines the supported filters for listing albums.
type ListParams struct {
	Page       int
	PerPage    int
	Search     string
	UserID     *int
	PlaylistID *int
}

// ListResult aggregates paginated album data.
type ListResult struct {
	Data    []Album `json:"data"`
	Page    int     `json:"page"`
	PerPage int     `json:"per_page"`
	Total   int     `json:"total"`
}

// Album is the transport representation of an album row.
type Album struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Total       int    `json:"total"`
	ReleaseYear *int   `json:"release_year"`
	IsBookmark  bool   `json:"is_bookmark"`
}

// Repository abstracts data access for albums.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

type service struct {
	repo Repository
}

// NewService creates a new album service backed by a repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	params.Page = pagination.NormalisePage(params.Page)
	params.PerPage = pagination.NormalisePerPage(params.PerPage)

	return s.repo.List(ctx, params)
}
