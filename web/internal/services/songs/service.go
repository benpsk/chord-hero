package songs

import (
	"context"
	"strings"

	"github.com/lyricapp/lyric/web/internal/apperror"
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
	LanguageID  int
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
	UserID int
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
	Lyric       *string  `json:"lyric,omitempty"`
	ReleaseYear *int     `json:"release_year"`
	Language    Language `json:"language"`
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

type Language struct {
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
		return Song{}, apperror.NotFound("song not found")
	}
	return s.repo.Get(ctx, id)
}

// Update applies new values to an existing song.
func (s *service) Update(ctx context.Context, id int, params UpdateParams) error {
	if id <= 0 {
		return apperror.NotFound("song not found")
	}

	if err := normaliseMutation(&params.MutationParams); err != nil {
		return err
	}

	return s.repo.Update(ctx, id, params)
}

// Delete removes a song record.
func (s *service) Delete(ctx context.Context, id int) error {
	if id <= 0 {
		return apperror.NotFound("song not found")
	}
	return s.repo.Delete(ctx, id)
}

// AssignLevel updates the associated level for a song.
func (s *service) AssignLevel(ctx context.Context, songID, levelID, userID int) error {
	if songID <= 0 {
		return apperror.NotFound("song not found")
	}
	if levelID <= 0 {
		return apperror.BadRequest("song: invalid level id")
	}

	if userID <= 0 {
		return apperror.Unauthorized("unauthorized user")
	}

	return s.repo.AssignLevel(ctx, songID, levelID, userID)
}

func normaliseMutation(params *MutationParams) error {
	ve := map[string]string{}
	title := strings.TrimSpace(params.Title)
	if title == "" {
		ve["title"] = "title is required"
	}
	params.Title = title

	if params.LevelID != nil {
		if *params.LevelID <= 0 {
			ve["level_id"] = "invalid level_id"
		}
	}
	if params.LanguageID != 0 {
		if params.LanguageID <= 0 {
			ve["language_id"] = "invalid language_id"
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

	if len(ve) > 0 {
		return apperror.Validation("msg", ve)
	}
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
