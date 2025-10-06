package songs

import (
	"context"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes song related domain behaviours.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams captures filtering options accepted by the list endpoint.
type ListParams struct {
	Page        int
	PerPage     int
	AlbumID     *int
	ArtistID    *int
	WriterID    *int
	ReleaseYear *int
	PlaylistID  *int
	Search      string
	UserID      *int
}

// ListResult represents a paginated song collection.
type ListResult struct {
	Data    []Song `json:"data"`
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Total   int    `json:"total"`
}

// Song describes the API payload for a song list item.
type Song struct {
	ID          int      `json:"id"`
	Title       string   `json:"title"`
	Level       *string  `json:"level,omitempty"`
	Key         *string  `json:"key,omitempty"`
	Language    *string  `json:"language,omitempty"`
	Lyric       *string  `json:"lyric,omitempty"`
	ReleaseYear *int     `json:"release_year"`
	Artists     []Person `json:"artists"`
	Writers     []Person `json:"writers"`
	Albums      []Album  `json:"albums"`
	IsBookmark  bool     `json:"is_bookmark"`
}

// Person represents either an artist or writer.
type Person struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Album captures album data associated with a song.
type Album struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	ReleaseYear *int   `json:"release_year"`
}

// Repository encapsulates storage for songs.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

type service struct {
	repo Repository
}

// NewService constructs a song service backed by the provided repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	params.Page = pagination.NormalisePage(params.Page)
	params.PerPage = pagination.NormalisePerPage(params.PerPage)

	return s.repo.List(ctx, params)
}
