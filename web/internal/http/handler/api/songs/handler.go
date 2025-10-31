package songs

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"github.com/lyricapp/lyric/web/internal/http/handler"
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

type songPayload struct {
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

func decodeSongPayload(r *http.Request) (songPayload, error) {
	var payload songPayload
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		return songPayload{}, err
	}
	return payload, nil
}

func (p songPayload) toMutationParams() (songsvc.MutationParams, error) {
	ve := map[string]string{}

	title := strings.TrimSpace(p.Title)
	if title == "" {
		ve["title"] = "title is required"
	}

	if p.LevelID == nil {
		ve["level_id"] = "level_id is required"
	} else if *p.LevelID <= 0 {
		ve["level_id"] = "level_id must be a positive integer"
	}

	if p.LanguageID == 0 {
		ve["language_id"] = "language_id is required"
	} else if p.LanguageID <= 0 {
		ve["language_id"] = "language_id must be a positive integer"
	}

	lyricTrimmed := strings.TrimSpace(p.Lyric)
	if lyricTrimmed == "" {
		ve["lyric"] = "lyric is required"
	}

	var releaseYear *int
	if p.ReleaseYear != nil {
		if *p.ReleaseYear <= 0 {
			ve["release_year"] = "release_year must be a positive integer"
		} else {
			releaseYear = p.ReleaseYear
		}
	}

	validateIDs := func(values []int, field string) []int {
		if len(values) == 0 {
			return []int{}
		}

		valid := make([]int, 0, len(values))
		for _, id := range values {
			if id <= 0 {
				ve[field] = field + " must contain positive integers"
				return []int{}
			}
			valid = append(valid, id)
		}
		return valid
	}

	albumIDs := validateIDs(p.AlbumIDs, "album_ids")
	artistIDs := validateIDs(p.ArtistIDs, "artist_ids")
	writerIDs := validateIDs(p.WriterIDs, "writer_ids")

	if len(ve) > 0 {
		return songsvc.MutationParams{}, apperror.Validation("msg", ve)
	}

	mutation := songsvc.MutationParams{
		Title:      title,
		AlbumIDs:   albumIDs,
		ArtistIDs:  artistIDs,
		WriterIDs:  writerIDs,
		LevelID:    p.LevelID,
		LanguageID: p.LanguageID,
	}

	if key := strings.TrimSpace(p.Key); key != "" {
		mutation.Key = &key
	}

	lyric := p.Lyric
	mutation.Lyric = &lyric

	if releaseYear != nil {
		mutation.ReleaseYear = releaseYear
	}

	return mutation, nil
}

// List responds with a paginated list of songs following the shared API shape.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {

	userID, _ := util.CurrentUserID(r)
	log.Println(userID)
	query := r.URL.Query()
	params := songsvc.ListParams{}
	validationErrors := map[string]string{}

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
	params.LevelID = util.ParseOptionalPositiveInt(query.Get("level_id"), "level_id", validationErrors)
	if strings.TrimSpace(query.Get("is_trending")) == "1" {
		params.IsTrending = true
	}

	params.Search = util.ParseOptionalSearch(query.Get("search"))

	if len(validationErrors) > 0 {
		handler.Error(w, apperror.Validation("failed validation", validationErrors))
		return
	}
	if params.UserID != nil {
		params.UserID = &userID
	} else {
		params.UserID = nil
	}
	params.AuthenticatedUserID = &userID

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		handler.Error(w, err)
		return
	}
	page := handler.PaginationResponse{
		Data:    result.Data,
		Page:    result.Page,
		PerPage: result.PerPage,
		Total:   result.Total,
	}
	handler.Success(w, http.StatusOK, page)
}

// Create stores a new song using the shared admin schema.
func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	payload, err := decodeSongPayload(r)
	if err != nil {
		handler.Error(w, err)
		return
	}

	mutation, err := payload.toMutationParams()
	if err != nil {
		handler.Error(w, err)
		return
	}

	params := songsvc.CreateParams{MutationParams: mutation, CreatedBy: &userID}
	songID, err := h.svc.Create(r.Context(), params)
	if err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusCreated, map[string]any{
		"message": "Song created successfully",
		"song_id": songID,
	})
}

// Update mutates an existing song using the shared admin schema.
func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}
	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	songID, err := strconv.Atoi(rawID)
	if err != nil || songID <= 0 {
		handler.Error(w, apperror.BadRequest("Invalid song id"))
		return
	}

	payload, err := decodeSongPayload(r)
	if err != nil {
		handler.Error(w, err)
		return
	}

	mutation, err := payload.toMutationParams()
	if err != nil {
		handler.Error(w, err)
		return
	}

	if err := h.svc.Update(r.Context(), songID, songsvc.UpdateParams{
		MutationParams: mutation,
		UserID:         userID,
	}); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]any{
		"message": "Song updated successfully",
	})
}

// Delete removes a song owned by the authenticated user.
func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	songID, err := strconv.Atoi(rawID)
	if err != nil || songID <= 0 {
		handler.Error(w, apperror.BadRequest("Invalid song id"))
		return
	}

	params := songsvc.DeleteParams{UserID: &userID}
	if err := h.svc.Delete(r.Context(), songID, params); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]any{
		"message": "Song deleted successfully",
	})
}

// UpdateStatus updates the workflow status for a song owned by the authenticated user.
func (h Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	songID, err := strconv.Atoi(rawID)
	if err != nil || songID <= 0 {
		handler.Error(w, apperror.BadRequest("Invalid song id"))
		return
	}

	statusParam := strings.TrimSpace(chi.URLParam(r, "status"))
	if statusParam == "" {
		handler.Error(w, apperror.BadRequest("Invalid status"))
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), songID, statusParam, userID); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]any{
		"message": "Song status updated successfully",
	})
}

// AssignLevel associates a level with the specified song.
func (h Handler) AssignLevel(w http.ResponseWriter, r *http.Request) {
	songIDValue := chi.URLParam(r, "song_id")
	levelIDValue := chi.URLParam(r, "level_id")

	songID, err := strconv.Atoi(strings.TrimSpace(songIDValue))
	if err != nil || songID <= 0 {
		handler.Error(w, apperror.BadRequest("Invalid song id"))
		return
	}

	levelID, err := strconv.Atoi(strings.TrimSpace(levelIDValue))
	if err != nil || levelID <= 0 {
		handler.Error(w, apperror.BadRequest("Invalid level id"))
		return
	}
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, err)
		return
	}

	if err := h.svc.AssignLevel(r.Context(), songID, levelID, userID); err != nil {
		handler.Error(w, err)
		return
	}
	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Level assigned successfully",
	})
}

// SyncPlaylists updates the playlists associated with a song.
func (h Handler) SyncPlaylists(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	songParam := strings.TrimSpace(chi.URLParam(r, "song_id"))
	songID, err := strconv.Atoi(songParam)
	if err != nil || songID <= 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"song_id": "song_id must be a positive integer"}))
		return
	}

	var payload struct {
		PlaylistIDs []int `json:"playlist_ids"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		handler.Error(w, apperror.BadRequest("invalid JSON payload"))
		return
	}

	if payload.PlaylistIDs == nil {
		handler.Error(w, apperror.Validation("msg", map[string]string{"playlist_ids": "playlist_ids must be provided"}))
		return
	}

	if err := h.svc.SyncPlaylists(r.Context(), songID, userID, payload.PlaylistIDs); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Song playlists updated successfully",
	})
}
