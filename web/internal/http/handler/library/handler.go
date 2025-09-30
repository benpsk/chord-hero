package library

import (
	"net/http"

	"github.com/a-h/templ"

	"github.com/lyricapp/lyric/web/internal/web/components"
)

// Handler renders the library page using templ components.
type Handler struct{}

// New constructs a handler for the library surface.
func New() *Handler {
	return &Handler{}
}

// ServeHTTP delegates rendering to templ's HTTP adapter.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	props := components.BuildLibraryProps()
	templ.Handler(components.Library(props)).ServeHTTP(w, r)
}
