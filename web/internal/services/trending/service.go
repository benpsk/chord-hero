package trending

import "context"

// Service aggregates trending data sets for the discovery endpoints.
type Service interface {
	TrendingSets(ctx context.Context) ([]Trending, error)
	TrendingAlbums(ctx context.Context) ([]TrendingAlbum, error)
	TrendingArtists(ctx context.Context) ([]TrendingArtist, error)
}

// Trending represents a curated trending collection.
type Trending struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	LevelID     *int    `json:"level_id,omitempty"`
	Level       *string `json:"level,omitempty"`
	Description *string `json:"description,omitempty"`
}

type Artist struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Writer struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// TrendingAlbum captures aggregate data for a popular album.
type TrendingAlbum struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Total       int      `json:"total"`
	ReleaseYear *int     `json:"release_year"`
	Artists     []Artist `json:"artists"`
	Writers     []Writer `json:"writers"`
}

// TrendingArtist captures aggregate data for a popular artist.
type TrendingArtist struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
}

// Repository encapsulates data access for trending resources.
type Repository interface {
	TrendingSets(ctx context.Context) ([]Trending, error)
	TrendingAlbums(ctx context.Context) ([]TrendingAlbum, error)
	TrendingArtists(ctx context.Context) ([]TrendingArtist, error)
}

type service struct {
	repo Repository
}

// NewService creates a trending service backed by a repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) TrendingSets(ctx context.Context) ([]Trending, error) {
	return s.repo.TrendingSets(ctx)
}

func (s *service) TrendingAlbums(ctx context.Context) ([]TrendingAlbum, error) {
	return s.repo.TrendingAlbums(ctx)
}

func (s *service) TrendingArtists(ctx context.Context) ([]TrendingArtist, error) {
	return s.repo.TrendingArtists(ctx)
}
