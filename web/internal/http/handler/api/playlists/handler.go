package playlists

import (
	"encoding/json"
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
	page := handler.PaginationResponse{
		Data:    result.Data,
		Page:    result.Page,
		PerPage: result.PerPage,
		Total:   result.Total,
	}
	handler.Success(w, http.StatusOK, page)
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

// UpdateSongs applies the provided action to the playlist songs.
func (h Handler) UpdateSongs(w http.ResponseWriter, r *http.Request) {
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

	var payload struct {
		SongIDs []int  `json:"song_ids"`
		Action  string `json:"action"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		handler.Error(w, apperror.BadRequest("invalid JSON payload"))
		return
	}

	action := strings.TrimSpace(payload.Action)
	if action == "" {
		handler.Error(w, apperror.Validation("msg", map[string]string{"action": "action must be provided"}))
		return
	}

	if len(payload.SongIDs) == 0 {
		handler.Error(w, apperror.Validation("msg", map[string]string{"song_ids": "song_ids must include at least one positive integer"}))
		return
	}

	if err := h.svc.UpdateSongs(r.Context(), userID, playlistID, payload.SongIDs, action); err != nil {
		handler.Error(w, err)
		return
	}

	handler.Success(w, http.StatusOK, map[string]string{
		"message": "Playlist songs updated successfully",
	})
}
