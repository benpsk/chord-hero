package api

import (
	"net/http"

	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
)

// WritersHandler serves writer catalogue responses.
type WritersHandler struct {
	svc writersvc.Service
}

// NewWritersHandler constructs a writer handler.
func NewWritersHandler(svc writersvc.Service) WritersHandler {
	return WritersHandler{svc: svc}
}

// List writes the writer list response in the shared API shape.
func (h WritersHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := writersvc.ListParams{}
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
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list writers"}})
		return
	}

	respondJSON(w, http.StatusOK, result)
}
