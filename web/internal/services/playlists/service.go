package playlists

import (
	"context"
	"strings"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes playlist catalogue operations.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
	Create(ctx context.Context, params CreateParams) (int, error)
	AddSongs(ctx context.Context, userID int, playlistID int, songIDs []int) error
	Update(ctx context.Context, id int, params UpdateParams) error
	Delete(ctx context.Context, id int, userID int) error
	RemoveSongs(ctx context.Context, playlistID int, userID int, songIDs []int) error
	Share(ctx context.Context, playlistID int, ownerID int, userIDs []int) error
	Leave(ctx context.Context, playlistID int, userID int) error
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

type User struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
}

// Playlist describes a playlist row for API consumers.
type Playlist struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	IsOwner    bool   `json:"is_owner"`
	SharedWith []User `json:"shared_with"`
	Total      int    `json:"total"`
}

// Repository abstracts playlist persistence operations.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
	Create(ctx context.Context, params CreateParams) (int, error)
	AddSongs(ctx context.Context, userID int, playlistID int, songIDs []int) error
	Update(ctx context.Context, id int, params UpdateParams) error
	Delete(ctx context.Context, id int, userID int) error
	RemoveSongs(ctx context.Context, playlistID int, userID int, songIDs []int) error
	Share(ctx context.Context, playlistID int, ownerID int, userIDs []int) error
	Leave(ctx context.Context, playlistID int, userID int) error
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

// UpdateParams captures fields required for playlist updates.
type UpdateParams struct {
	Name   string
	UserID int
}

func (s *service) Create(ctx context.Context, params CreateParams) (int, error) {
	params.Name = strings.TrimSpace(params.Name)
	if params.Name == "" {
		return 0, apperror.Validation("msg", map[string]string{"name": "name is required"})
	}
	if params.UserID <= 0 {
		return 0, apperror.Unauthorized("Unauthorized error")
	}

	return s.repo.Create(ctx, params)
}

func (s *service) AddSongs(ctx context.Context, userID, playlistID int, songIDs []int) error {
	if playlistID <= 0 {
		return apperror.NotFound("playlist not found")
	}

	filtered := uniquePositive(songIDs)
	if len(filtered) == 0 {
		return apperror.BadRequest("invalid song_ids")
	}

	return s.repo.AddSongs(ctx, userID, playlistID, filtered)
}

// Update mutates playlist attributes belonging to the provided user.
func (s *service) Update(ctx context.Context, id int, params UpdateParams) error {
	if id <= 0 {
		return apperror.Unauthorized("Unauthorized error")
	}

	params.Name = strings.TrimSpace(params.Name)
	if params.Name == "" {
		return apperror.Validation("msg", map[string]string{"name": "name is required"})
	}

	if params.UserID <= 0 {
		return apperror.Unauthorized("Unauthorized user")
	}

	return s.repo.Update(ctx, id, params)
}

// Delete removes a playlist owned by the provided user.
func (s *service) Delete(ctx context.Context, id int, userID int) error {
	if id <= 0 {
		return apperror.NotFound("playlist not found")
	}
	if userID <= 0 {
		return apperror.Unauthorized("Unauthorized user")
	}
	return s.repo.Delete(ctx, id, userID)
}

// RemoveSongs detaches provided songs from a playlist owned by the user.
func (s *service) RemoveSongs(ctx context.Context, playlistID int, userID int, songIDs []int) error {
	if playlistID <= 0 {
		return apperror.NotFound("playlist not found")
	}
	if userID <= 0 {
		return apperror.Unauthorized("Unauthorized user")
	}

	filtered := uniquePositive(songIDs)
	if len(filtered) == 0 {
		return apperror.BadRequest("invalid song_ids")
	}

	return s.repo.RemoveSongs(ctx, playlistID, userID, filtered)
}

// Share synchronises shared users for a playlist owned by the inviter.
func (s *service) Share(ctx context.Context, playlistID int, ownerID int, userIDs []int) error {
	if playlistID <= 0 {
		return apperror.NotFound("playlist not found")
	}
	if ownerID <= 0 {
		return apperror.Unauthorized("Unauthorized user")
	}

	filtered := uniquePositive(userIDs)
	if len(filtered) == 0 {
		return s.repo.Share(ctx, playlistID, ownerID, nil)
	}

	clean := make([]int, 0, len(filtered))
	for _, id := range filtered {
		if id == ownerID {
			continue
		}
		clean = append(clean, id)
	}

	return s.repo.Share(ctx, playlistID, ownerID, clean)
}

// Leave removes the user from the playlist membership.
func (s *service) Leave(ctx context.Context, playlistID int, userID int) error {
	if playlistID <= 0 {
		return apperror.NotFound("playlist not found")
	}
	if userID <= 0 {
		return apperror.Unauthorized("Unauthorized user")
	}
	return s.repo.Leave(ctx, playlistID, userID)
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
