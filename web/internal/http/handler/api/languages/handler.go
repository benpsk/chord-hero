package languages

import (
	"log"
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
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
	log.Println(err)
	if err != nil {
		log.Println(err)
		util.RespondJSONOld(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list languages"}})
		return
	}

	util.RespondJSONOld(w, http.StatusOK, map[string]any{"data": languages})
}
