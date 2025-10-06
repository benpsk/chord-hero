package api

import (
	"net/http"

	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
)

// TrendingHandler serves trending collections.
type TrendingHandler struct {
	svc trendingsvc.Service
}

// NewTrendingHandler wires the trending service into HTTP handlers.
func NewTrendingHandler(svc trendingsvc.Service) TrendingHandler {
	return TrendingHandler{svc: svc}
}

// List responds with curated trending sets.
func (h TrendingHandler) List(w http.ResponseWriter, r *http.Request) {
	collections, err := h.svc.TrendingSets(r.Context())
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trendings"}})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"data": collections})
}

// Albums responds with trending albums.
func (h TrendingHandler) Albums(w http.ResponseWriter, r *http.Request) {
	validationErrors := map[string]string{}
	limit := 0
	if v := parseOptionalPositiveInt(r.URL.Query().Get("limit"), "limit", validationErrors); v != nil {
		limit = *v
	}

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	albums, err := h.svc.TrendingAlbums(r.Context(), limit)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trending albums"}})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"data": albums})
}

// Artists responds with trending artists.
func (h TrendingHandler) Artists(w http.ResponseWriter, r *http.Request) {
	validationErrors := map[string]string{}
	limit := 0
	if v := parseOptionalPositiveInt(r.URL.Query().Get("limit"), "limit", validationErrors); v != nil {
		limit = *v
	}

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	artists, err := h.svc.TrendingArtists(r.Context(), limit)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list trending artists"}})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"data": artists})
}
