package api

import (
	"net/http"

	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
)

// AlbumsHandler exposes album catalogue endpoints under /api.
type AlbumsHandler struct {
	svc albumsvc.Service
}

// NewAlbumsHandler wires the album service into a handler instance.
func NewAlbumsHandler(svc albumsvc.Service) AlbumsHandler {
	return AlbumsHandler{svc: svc}
}

// List responds with paginated albums using the shared API response format.
func (h AlbumsHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := albumsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := parseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := parseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = parseOptionalSearch(query.Get("search"))
	params.PlaylistID = parseOptionalPositiveInt(query.Get("playlist_id"), "playlist_id", validationErrors)
	params.UserID = parseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list albums"}})
		return
	}

	respondJSON(w, http.StatusOK, result)
}
