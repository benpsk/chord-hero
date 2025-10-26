package levels

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
)

// Handler exposes level catalogue endpoints.
type Handler struct {
	svc levelsvc.Service
}

// New wires the level service into an HTTP handler.
func New(svc levelsvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with all available levels.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	levels, err := h.svc.List(r.Context())
	if err != nil {
		handler.Error(w, err)
		return
	}
	handler.Success(w, http.StatusOK, levels)
}
