package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	chordsvc "github.com/lyricapp/lyric/web/internal/services/chords"
)

// ChordsHandler serves chord lookups.
type ChordsHandler struct {
	svc chordsvc.Service
}

// NewChordsHandler constructs a chord handler instance.
func NewChordsHandler(svc chordsvc.Service) ChordsHandler {
	return ChordsHandler{svc: svc}
}

// Show responds with a chord definition.
func (h ChordsHandler) Show(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "chord name is required"}})
		return
	}

	chord, err := h.svc.Find(r.Context(), name)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "chord not found"}})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"data": chord})
}
