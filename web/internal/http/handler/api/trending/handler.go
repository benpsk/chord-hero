package trending

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
)

// Handler serves trending collections.
type Handler struct {
	svc trendingsvc.Service
}

// New wires the trending service into HTTP handlers.
func New(svc trendingsvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with curated trending sets.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	collections, err := h.svc.TrendingSets(r.Context())
	if err != nil {
		util.RespondJSONOld(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trendings"}})
		return
	}

	util.RespondJSONOld(w, http.StatusOK, map[string]any{"data": collections})
}

// Albums responds with trending albums.
func (h Handler) Albums(w http.ResponseWriter, r *http.Request) {
	albums, err := h.svc.TrendingAlbums(r.Context())
	if err != nil {
		util.RespondJSONOld(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trending albums"}})
		return
	}

	util.RespondJSONOld(w, http.StatusOK, map[string]any{"data": albums})
}

// Artists responds with trending artists.
func (h Handler) Artists(w http.ResponseWriter, r *http.Request) {
	artists, err := h.svc.TrendingArtists(r.Context())
	if err != nil {
		util.RespondJSONOld(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trending artists"}})
		return
	}

	util.RespondJSONOld(w, http.StatusOK, map[string]any{"data": artists})
}
