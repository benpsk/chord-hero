package songs

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
)

// Handler exposes song catalogue endpoints.
type Handler struct {
	svc songsvc.Service
}

// New wires the songs service into an HTTP handler.
func New(svc songsvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with a paginated list of songs following the shared API shape.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := songsvc.ListParams{}
	validationErrors := util.NewValidationError()

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.AlbumID = util.ParseOptionalPositiveInt(query.Get("album_id"), "album_id", validationErrors)
	params.ArtistID = util.ParseOptionalPositiveInt(query.Get("artist_id"), "artist_id", validationErrors)
	params.WriterID = util.ParseOptionalPositiveInt(query.Get("writer_id"), "writer_id", validationErrors)
	params.ReleaseYear = util.ParseOptionalInt(query.Get("release_year"), "release_year", validationErrors)
	params.PlaylistID = util.ParseOptionalPositiveInt(query.Get("playlist_id"), "playlist_id", validationErrors)
	params.UserID = util.ParseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

	params.Search = util.ParseOptionalSearch(query.Get("search"))

	if validationErrors.Err() != nil {
		util.RespondError(w, validationErrors)
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		util.RespondError(w, err)
		return
	}
	page := util.PaginationResponse{
		Data:    result.Data,
		Page:    result.Page,
		PerPage: result.PerPage,
		Total:   result.Total,
	}
	util.RespondJSON(w, http.StatusOK, page)
}

// Create stores a new song using the shared admin schema.
func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title       string `json:"title"`
		LevelID     *int   `json:"level_id"`
		Key         string `json:"key"`
		LanguageID  int    `json:"language_id"`
		ReleaseYear *int   `json:"release_year"`
		AlbumIDs    []int  `json:"album_ids"`
		ArtistIDs   []int  `json:"artist_ids"`
		WriterIDs   []int  `json:"writer_ids"`
		Lyric       string `json:"lyric"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, err)
		return
	}

	title := strings.TrimSpace(payload.Title)
	key := strings.TrimSpace(payload.Key)
	lyricTrimmed := strings.TrimSpace(payload.Lyric)

	ve := util.NewValidationError()

	if title == "" {
		ve.AddField("title", "title is required")
	}

	if payload.LevelID == nil {
		ve.AddField("level_id", "level_id is required")
	} else if *payload.LevelID <= 0 {
		ve.AddField("level_id", "level_id must be a positive integer")
	}
	if payload.LanguageID == 0 {
		ve.AddField("language_id", "language_id is required")
	} else if payload.LanguageID <= 0 {
		ve.AddField("language_id", "language_id must be a positive integer")
	}

	if lyricTrimmed == "" {
		ve.AddField("lyric", "lyric is required")
	}

	var releaseYear *int
	if payload.ReleaseYear != nil {
		if *payload.ReleaseYear <= 0 {
			ve.AddField("release_year", "release_year must be a positive integer")
		} else {
			releaseYear = payload.ReleaseYear
		}
	}

	validateIDs := func(values []int, field string) []int {
		if len(values) == 0 {
			return []int{}
		}

		valid := make([]int, 0, len(values))
		for _, id := range values {
			if id <= 0 {
				ve.AddField(field, field+" must contain positive integers")
				return []int{}
			}
			valid = append(valid, id)
		}
		return valid
	}

	albumIDs := validateIDs(payload.AlbumIDs, "album_ids")
	artistIDs := validateIDs(payload.ArtistIDs, "artist_ids")
	writerIDs := validateIDs(payload.WriterIDs, "writer_ids")

	if ve.Err() != nil {
		util.RespondError(w, ve)
		return
	}

	params := songsvc.CreateParams{
		MutationParams: songsvc.MutationParams{
			Title:      title,
			AlbumIDs:   albumIDs,
			ArtistIDs:  artistIDs,
			WriterIDs:  writerIDs,
			LevelID:    payload.LevelID,
			LanguageID: payload.LanguageID,
		},
	}

	if key != "" {
		params.Key = &key
	}
	lyric := payload.Lyric
	params.Lyric = &lyric
	if releaseYear != nil {
		params.ReleaseYear = releaseYear
	}

	songID, err := h.svc.Create(r.Context(), params)
	if err != nil {
		util.RespondError(w, err)
		return
	}

	util.RespondJSON(w, http.StatusCreated, map[string]any{
		"message": "Song created successfully",
		"song_id": songID,
	})
}

// AssignLevel associates a level with the specified song.
func (h Handler) AssignLevel(w http.ResponseWriter, r *http.Request) {
	songIDValue := chi.URLParam(r, "song_id")
	levelIDValue := chi.URLParam(r, "level_id")

	songID, err := strconv.Atoi(strings.TrimSpace(songIDValue))
	if err != nil || songID <= 0 {
		util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "song_id must be a positive integer"}})
		return
	}

	levelID, err := strconv.Atoi(strings.TrimSpace(levelIDValue))
	if err != nil || levelID <= 0 {
		util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "level_id must be a positive integer"}})
		return
	}
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	if err := h.svc.AssignLevel(r.Context(), songID, levelID, userID); err != nil {
		switch {
		case errors.Is(err, songsvc.ErrNotFound):
			util.RespondJSONOld(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "song not found"}})
			return
		case errors.Is(err, songsvc.ErrInvalidLevel):
			util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "level not found"}})
			return
		case errors.Is(err, songsvc.ErrInvalidUser):
			util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user not found"}})
			return
		default:
			msg := err.Error()
			if strings.Contains(msg, "invalid level id") {
				util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "level_id must be a positive integer"}})
				return
			}
			log.Println(err)
			util.RespondJSONOld(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to assign level"}})
			return
		}
	}

	util.RespondJSONOld(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Level assigned successfully",
		},
	})
}
