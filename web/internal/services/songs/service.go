package songs

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/lyricapp/lyric/web/pkg/pagination"
)

// Service exposes song related domain behaviours.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
	Get(ctx context.Context, id int) (Song, error)
	Create(ctx context.Context, params CreateParams) (int, error)
	Update(ctx context.Context, id int, params UpdateParams) error
	Delete(ctx context.Context, id int) error
	AssignLevel(ctx context.Context, songID, levelID, userID int) error
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

// MutationParams captures shared song fields used across create and update flows.
type MutationParams struct {
	Title       string
	LevelID     *int
	Key         *string
	Language    *string
	Lyric       *string
	ReleaseYear *int
	AlbumIDs    []int
	ArtistIDs   []int
	WriterIDs   []int
}

// CreateParams captures the fields required to create a new song record.
type CreateParams struct {
	MutationParams
	CreatedBy *int
}

// UpdateParams captures the fields required to update an existing song record.
type UpdateParams struct {
	MutationParams
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
	Level       *Level   `json:"level,omitempty"`
	Key         *string  `json:"key,omitempty"`
	Language    *string  `json:"language,omitempty"`
	Lyric       *string  `json:"lyric,omitempty"`
	ReleaseYear *int     `json:"release_year"`
	Status      string   `json:"status"`
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

// Level captures structured difficulty metadata.
type Level struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Repository encapsulates storage for songs.
type Repository interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
	Create(ctx context.Context, params CreateParams) (int, error)
	Get(ctx context.Context, id int) (Song, error)
	Update(ctx context.Context, id int, params UpdateParams) error
	Delete(ctx context.Context, id int) error
	AssignLevel(ctx context.Context, songID, levelID, userID int) error
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

var (
	allowedLanguages = map[string]struct{}{
		"english": {},
		"burmese": {},
	}
)

// ErrTitleRequired is returned when attempting to create a song without a title.
var ErrTitleRequired = errors.New("songs: title is required")

// ErrNotFound indicates a requested song does not exist.
var ErrNotFound = errors.New("songs: not found")

// ErrInvalidLevel indicates the supplied level is missing or invalid.
var ErrInvalidLevel = errors.New("songs: invalid level")

// ErrInvalidUser indicates the supplied user is missing or invalid.
var ErrInvalidUser = errors.New("songs: invalid user")

func (s *service) Create(ctx context.Context, params CreateParams) (int, error) {
	if err := normaliseMutation(&params.MutationParams); err != nil {
		return 0, err
	}

	if params.CreatedBy != nil && *params.CreatedBy <= 0 {
		params.CreatedBy = nil
	}

	return s.repo.Create(ctx, params)
}

// Get returns a song with its related data by identifier.
func (s *service) Get(ctx context.Context, id int) (Song, error) {
	if id <= 0 {
		return Song{}, ErrNotFound
	}
	return s.repo.Get(ctx, id)
}

// Update applies new values to an existing song.
func (s *service) Update(ctx context.Context, id int, params UpdateParams) error {
	if id <= 0 {
		return ErrNotFound
	}

	if err := normaliseMutation(&params.MutationParams); err != nil {
		return err
	}

	return s.repo.Update(ctx, id, params)
}

// Delete removes a song record.
func (s *service) Delete(ctx context.Context, id int) error {
	if id <= 0 {
		return ErrNotFound
	}
	return s.repo.Delete(ctx, id)
}

// AssignLevel updates the associated level for a song.
func (s *service) AssignLevel(ctx context.Context, songID, levelID, userID int) error {
	if songID <= 0 {
		return ErrNotFound
	}
	if levelID <= 0 {
		return fmt.Errorf("songs: invalid level id %d", levelID)
	}

	if userID <= 0 {
		return ErrInvalidUser
	}

	return s.repo.AssignLevel(ctx, songID, levelID, userID)
}

func normaliseMutation(params *MutationParams) error {
	title := strings.TrimSpace(params.Title)
	if title == "" {
		return ErrTitleRequired
	}
	params.Title = title

	if params.LevelID != nil {
		if *params.LevelID <= 0 {
			return fmt.Errorf("songs: invalid level id %d", *params.LevelID)
		}
	}

	if params.Language != nil {
		value := strings.ToLower(strings.TrimSpace(*params.Language))
		if value == "" {
			params.Language = nil
		} else {
			if _, ok := allowedLanguages[value]; !ok {
				return fmt.Errorf("songs: invalid language %q", value)
			}
			params.Language = ptr(value)
		}
	}

	if params.Key != nil {
		value := strings.TrimSpace(*params.Key)
		if value == "" {
			params.Key = nil
		} else {
			params.Key = ptr(value)
		}
	}

	if params.Lyric != nil {
		value := strings.ReplaceAll(*params.Lyric, "\r\n", "\n")
		params.Lyric = ptr(value)
	}

	if params.ReleaseYear != nil {
		if *params.ReleaseYear <= 0 {
			params.ReleaseYear = nil
		}
	}

	params.ArtistIDs = uniquePositive(params.ArtistIDs)
	params.WriterIDs = uniquePositive(params.WriterIDs)
	params.AlbumIDs = uniquePositive(params.AlbumIDs)

	return nil
}

func ptr[T any](value T) *T {
	return &value
}

func uniquePositive(values []int) []int {
	seen := make(map[int]struct{}, len(values))
	result := make([]int, 0, len(values))
	for _, v := range values {
		if v <= 0 {
			continue
		}
		if _, exists := seen[v]; exists {
			continue
		}
		seen[v] = struct{}{}
		result = append(result, v)
	}
	return result
}
