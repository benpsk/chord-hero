package api

import (
	"net/http"

	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
)

// ArtistsHandler serves artist catalogue responses.
type ArtistsHandler struct {
	svc artistsvc.Service
}

// NewArtistsHandler constructs an artist handler.
func NewArtistsHandler(svc artistsvc.Service) ArtistsHandler {
	return ArtistsHandler{svc: svc}
}

// List writes the artist list response in the shared API shape.
func (h ArtistsHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := artistsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := parseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := parseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = parseOptionalSearch(query.Get("search"))

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list artists"}})
		return
	}

	respondJSON(w, http.StatusOK, result)
}
