package playlists

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
)

// Handler exposes playlist catalogue operations.
type Handler struct {
	svc playlistsvc.Service
}

// New wires the playlist service into an HTTP handler instance.
func New(svc playlistsvc.Service) Handler {
	return Handler{svc: svc}
}

// List provides a paginated playlist payload.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	query := r.URL.Query()
	params := playlistsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = util.ParseOptionalSearch(query.Get("search"))
	params.UserID = &userID

	if len(validationErrors) > 0 {
		handler.Error(w, apperror.Validation("failed validation", validationErrors))
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, result)
}

// Create stores a playlist for the default user.
func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	var payload struct {
		Name string `json:"name"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		handler.Error(w, err)
		return
	}

	name := strings.TrimSpace(payload.Name)
	errorsMap := map[string]string{}
	if name == "" {
		errorsMap["name"] = "name is required"
	}
	if len(name) > 45 {
		errorsMap["name"] = "name too long!"
	}
	if len(errorsMap) > 0 {
		handler.Error(w, apperror.Validation("msg", errorsMap))
		return
	}

	playlistID, err := h.svc.Create(r.Context(), playlistsvc.CreateParams{
		Name:   name,
		UserID: userID,
	})
	if err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusCreated, map[string]any{
		"message":     "Playlist created successfully",
		"playlist_id": playlistID,
	})
}

// Update renames an existing playlist owned by the authenticated user.
func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		handler.Error(w, err)
		return
	}

	var payload struct {
		Name string `json:"name"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		handler.Error(w, err)
		return
	}

	name := strings.TrimSpace(payload.Name)
	if name == "" {
		handler.Error(w, apperror.Validation("msg", map[string]string{"name": "name is required"}))
		return
	}

	if err := h.svc.Update(r.Context(), playlistID, playlistsvc.UpdateParams{
		Name:   name,
		UserID: userID,
	}); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Playlist updated successfully",
	})
}

// Delete removes a playlist owned by the authenticated user.
func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"message": "id must be a positive integer"}))
		return
	}

	if err := h.svc.Delete(r.Context(), playlistID, userID); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Playlist deleted successfully",
	})
}

// Leave removes the authenticated user from the playlist membership.
func (h Handler) Leave(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"message": "id must be a positive integer"}))
		return
	}

	if err := h.svc.Leave(r.Context(), playlistID, userID); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]any{
		"message": "Left playlist successfully",
	})
}

// RemoveSongs detaches songs from the playlist.
func (h Handler) RemoveSongs(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		handler.Error(w, err)
		return
	}

	var payload struct {
		SongIDs []int `json:"song_ids"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		handler.Error(w, apperror.BadRequest("inalid JSON payload"))
		return
	}

	validIds := make([]int, 0, len(payload.SongIDs))
	for _, id := range payload.SongIDs {
		if id <= 0 {
			handler.Error(w, apperror.Validation("msg", map[string]string{"song_ids": "song_ids must include positive integers"}))
			return
		}
		validIds = append(validIds, id)
	}
	if len(validIds) == 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"song_ids": "song_ids must include at least one positive integer"}))
		return
	}

	if err := h.svc.RemoveSongs(r.Context(), playlistID, userID, validIds); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Songs removed from playlist successfully",
	})
}

// Share synchronises shared users for the playlist.
func (h Handler) Share(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"id": "id must be a positive integer"}))
		return
	}

	var payload struct {
		UserIDs []int `json:"user_ids"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		handler.Error(w, apperror.BadRequest("invalid JSON payload"))
		return
	}

	validIDs := make([]int, 0, len(payload.UserIDs))
	for _, id := range payload.UserIDs {
		if id <= 0 {
			handler.Error(w, apperror.Validation("msg", map[string]string{"user_ids": "user_ids must contain positive integers"}))
			return
		}
		validIDs = append(validIDs, id)
	}

	if err := h.svc.Share(r.Context(), playlistID, userID, validIDs); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Playlist sharing updated successfully",
	})
}

// AddSongs attaches the provided songs to the playlist.
func (h Handler) AddSongs(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		handler.Error(w, authErr)
		return
	}
	playlistParam := strings.TrimSpace(chi.URLParam(r, "playlist_id"))
	playlistID, err := strconv.Atoi(playlistParam)
	if err != nil || playlistID <= 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"message": "playlist_id must be a positive integer"}))
		return
	}

	rawSongIDs := strings.TrimSpace(chi.URLParam(r, "song_ids"))
	if rawSongIDs == "" {
		handler.Error(w, apperror.Validation("msg", map[string]string{"song_ids": "song_ids must be provided as comma separated integers"}))
		return
	}

	ids, parseErr := parseSongIDs(rawSongIDs)
	if parseErr != nil {
		handler.Error(w, apperror.Validation("msg", map[string]string{"song_ids": parseErr.Error()}))
		return
	}

	if err := h.svc.AddSongs(r.Context(), userID, playlistID, ids); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Songs added to playlist successfully",
	})
}

func parseSongIDs(raw string) ([]int, error) {
	parts := strings.Split(raw, ",")
	ids := make([]int, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		id, err := strconv.Atoi(value)
		if err != nil || id <= 0 {
			return nil, errors.New("song_ids must be positive integers separated by commas")
		}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return nil, errors.New("song_ids must include at least one positive integer")
	}

	return ids, nil
}
