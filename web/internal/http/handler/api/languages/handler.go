package languages

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	languagesvc "github.com/lyricapp/lyric/web/internal/services/languages"
)

// Handler exposes level catalogue endpoints.
type Handler struct {
	svc languagesvc.Service
}

// New wires the level service into an HTTP handler.
func New(svc languagesvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with all available languages.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	languages, err := h.svc.List(r.Context())
	if err != nil {
		handler.Error(w, err)
		return
	}
	handler.Success(w, http.StatusOK, languages)
}
