package api

import (
	"net/http"

	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
)

// PlaylistsHandler exposes playlist catalogue endpoints.
type PlaylistsHandler struct {
	svc playlistsvc.Service
}

// NewPlaylistsHandler wires the playlist service into an HTTP handler.
func NewPlaylistsHandler(svc playlistsvc.Service) PlaylistsHandler {
	return PlaylistsHandler{svc: svc}
}

// List responds with paginated playlists following the shared API format.
func (h PlaylistsHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := playlistsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := parseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := parseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = parseOptionalSearch(query.Get("search"))
	params.UserID = parseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list playlists"}})
		return
	}

	respondJSON(w, http.StatusOK, result)
}
