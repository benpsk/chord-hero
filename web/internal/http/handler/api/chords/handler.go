package chords

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	chordsvc "github.com/lyricapp/lyric/web/internal/services/chords"
)

// Handler serves chord lookups.
type Handler struct {
	svc chordsvc.Service
}

// New constructs a chord handler instance.
func New(svc chordsvc.Service) Handler {
	return Handler{svc: svc}
}

// Show responds with a chord definition.
func (h Handler) Show(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if name == "" {
		util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "chord name is required"}})
		return
	}

	chord, err := h.svc.Find(r.Context(), name)
	if err != nil {
		util.RespondJSONOld(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "chord not found"}})
		return
	}

	util.RespondJSONOld(w, http.StatusOK, map[string]any{"data": chord})
}
