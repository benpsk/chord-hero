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
	Create(ctx context.Context, params CreateParams) (int, error)
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

// CreateParams captures the fields required to create a new song record.
type CreateParams struct {
	Title           string
	Level           *string
	Key             *string
	Language        *string
	Lyric           *string
	ReleaseYear     *int
	AlbumID         *int
	PrimaryWriterID *int
	ArtistIDs       []int
	WriterIDs       []int
	CreatedBy       *int
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
	Create(ctx context.Context, params CreateParams) (int, error)
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
	allowedLevels = map[string]struct{}{
		"easy":   {},
		"medium": {},
		"hard":   {},
	}
	allowedLanguages = map[string]struct{}{
		"english": {},
		"burmese": {},
	}
)

// ErrTitleRequired is returned when attempting to create a song without a title.
var ErrTitleRequired = errors.New("songs: title is required")

func (s *service) Create(ctx context.Context, params CreateParams) (int, error) {
	title := strings.TrimSpace(params.Title)
	if title == "" {
		return 0, ErrTitleRequired
	}
	params.Title = title

	if params.Level != nil {
		value := strings.ToLower(strings.TrimSpace(*params.Level))
		if value == "" {
			params.Level = nil
		} else {
			if _, ok := allowedLevels[value]; !ok {
				return 0, fmt.Errorf("songs: invalid level %q", value)
			}
			params.Level = ptr(value)
		}
	}

	if params.Language != nil {
		value := strings.ToLower(strings.TrimSpace(*params.Language))
		if value == "" {
			params.Language = nil
		} else {
			if _, ok := allowedLanguages[value]; !ok {
				return 0, fmt.Errorf("songs: invalid language %q", value)
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
		//		value = strings.ReplaceAll(value, "\n", "\\n")
		params.Lyric = ptr(value)
	}

	if params.ReleaseYear != nil {
		if *params.ReleaseYear <= 0 {
			params.ReleaseYear = nil
		}
	}

	if params.AlbumID != nil && *params.AlbumID <= 0 {
		params.AlbumID = nil
	}

	if params.PrimaryWriterID != nil && *params.PrimaryWriterID <= 0 {
		params.PrimaryWriterID = nil
	}

	if params.CreatedBy != nil && *params.CreatedBy <= 0 {
		params.CreatedBy = nil
	}

	params.ArtistIDs = uniquePositive(params.ArtistIDs)
	params.WriterIDs = uniquePositive(params.WriterIDs)

	return s.repo.Create(ctx, params)
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
