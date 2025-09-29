package songs

import (
	"net/http"
	"strconv"

	"github.com/a-h/templ"
	"github.com/go-chi/chi/v5"

	"github.com/lyricapp/lyric/web/internal/web/components"
	"github.com/lyricapp/lyric/web/internal/web/data"
)

// Handler renders song detail pages with chord display modes.
type Handler struct{}

// New constructs a song detail handler.
func New() *Handler {
	return &Handler{}
}

// ServeHTTP looks up the song and renders the requested view mode.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	songID := chi.URLParam(r, "id")
	song, ok := data.GetSongByID(songID)
	if !ok {
		http.NotFound(w, r)
		return
	}

	query := r.URL.Query()
	view := components.SongModeOverlay
	if supplied := query.Get("view"); supplied != "" {
		view = components.SongDetailMode(supplied)
	}

	transpose := 0
	if raw := query.Get("transpose"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil {
			transpose = value
		}
	}

	overGap := 2
	if raw := query.Get("gap"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil {
			overGap = value
		}
	}

	lineGap := 0
	if raw := query.Get("lineGap"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil {
			lineGap = value
		}
	}

	columns := 1
	if raw := query.Get("columns"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil {
			columns = value
		}
	}

	props := components.BuildSongDetailProps(song, view, transpose, overGap, lineGap, columns)
	templ.Handler(components.SongDetail(props)).ServeHTTP(w, r)
}
