package playlists

import (
	"context"
	"errors"
	"strings"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes playlist catalogue operations.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
	Create(ctx context.Context, params CreateParams) (int, error)
	AddSongs(ctx context.Context, playlistID int, songIDs []int) error
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
	Create(ctx context.Context, params CreateParams) (int, error)
	AddSongs(ctx context.Context, playlistID int, songIDs []int) error
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

// CreateParams captures fields required for playlist creation.
type CreateParams struct {
	Name   string
	UserID int
}

var (
	// ErrNameRequired indicates the playlist name was empty.
	ErrNameRequired = errors.New("playlists: name is required")
	// ErrInvalidUser indicates the provided user does not exist or is invalid.
	ErrInvalidUser = errors.New("playlists: invalid user")
	// ErrPlaylistNotFound indicates the playlist cannot be located.
	ErrPlaylistNotFound = errors.New("playlists: not found")
	// ErrSongNotFound indicates one of the supplied songs does not exist.
	ErrSongNotFound = errors.New("playlists: song not found")
	// ErrSongsRequired indicates no valid songs were supplied for assignment.
	ErrSongsRequired = errors.New("playlists: songs are required")
)

func (s *service) Create(ctx context.Context, params CreateParams) (int, error) {
	params.Name = strings.TrimSpace(params.Name)
	if params.Name == "" {
		return 0, ErrNameRequired
	}
	if params.UserID <= 0 {
		return 0, ErrInvalidUser
	}

	return s.repo.Create(ctx, params)
}

func (s *service) AddSongs(ctx context.Context, playlistID int, songIDs []int) error {
	if playlistID <= 0 {
		return ErrPlaylistNotFound
	}

	filtered := uniquePositive(songIDs)
	if len(filtered) == 0 {
		return ErrSongsRequired
	}

	return s.repo.AddSongs(ctx, playlistID, filtered)
}

func uniquePositive(values []int) []int {
	if len(values) == 0 {
		return nil
	}

	seen := make(map[int]struct{}, len(values))
	result := make([]int, 0, len(values))
	for _, v := range values {
		if v <= 0 {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		result = append(result, v)
	}
	return result
}
