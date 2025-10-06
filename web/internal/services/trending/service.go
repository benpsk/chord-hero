package trending

import "context"

// Service aggregates trending data sets for the discovery endpoints.
type Service interface {
	TrendingSets(ctx context.Context) ([]Trending, error)
	TrendingAlbums(ctx context.Context, limit int) ([]TrendingAlbum, error)
	TrendingArtists(ctx context.Context, limit int) ([]TrendingArtist, error)
}

// Trending represents a curated trending collection.
type Trending struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Level       *string `json:"level,omitempty"`
	Description *string `json:"description,omitempty"`
}

// TrendingAlbum captures aggregate data for a popular album.
type TrendingAlbum struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

// TrendingArtist captures aggregate data for a popular artist.
type TrendingArtist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

// Repository encapsulates data access for trending resources.
type Repository interface {
	TrendingSets(ctx context.Context) ([]Trending, error)
	TrendingAlbums(ctx context.Context, limit int) ([]TrendingAlbum, error)
	TrendingArtists(ctx context.Context, limit int) ([]TrendingArtist, error)
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

func (s *service) TrendingAlbums(ctx context.Context, limit int) ([]TrendingAlbum, error) {
	return s.repo.TrendingAlbums(ctx, limit)
}

func (s *service) TrendingArtists(ctx context.Context, limit int) ([]TrendingArtist, error) {
	return s.repo.TrendingArtists(ctx, limit)
}
