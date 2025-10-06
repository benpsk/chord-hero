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
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trendings"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{"data": collections})
}

// Albums responds with trending albums.
func (h Handler) Albums(w http.ResponseWriter, r *http.Request) {
	validationErrors := map[string]string{}
	limit := 0
	if v := util.ParseOptionalPositiveInt(r.URL.Query().Get("limit"), "limit", validationErrors); v != nil {
		limit = *v
	}

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	albums, err := h.svc.TrendingAlbums(r.Context(), limit)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trending albums"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{"data": albums})
}

// Artists responds with trending artists.
func (h Handler) Artists(w http.ResponseWriter, r *http.Request) {
	validationErrors := map[string]string{}
	limit := 0
	if v := util.ParseOptionalPositiveInt(r.URL.Query().Get("limit"), "limit", validationErrors); v != nil {
		limit = *v
	}

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	artists, err := h.svc.TrendingArtists(r.Context(), limit)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trending artists"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{"data": artists})
}
