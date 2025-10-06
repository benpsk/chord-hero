package api

import (
	"net/http"

	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
)

// ReleaseYearHandler exposes the release year catalogue.
type ReleaseYearHandler struct {
	svc releaseyearsvc.Service
}

// NewReleaseYearHandler constructs a handler instance.
func NewReleaseYearHandler(svc releaseyearsvc.Service) ReleaseYearHandler {
	return ReleaseYearHandler{svc: svc}
}

// List responds with aggregated release year data.
func (h ReleaseYearHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := releaseyearsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := parseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := parseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list release years"}})
		return
	}

	respondJSON(w, http.StatusOK, result)
}
