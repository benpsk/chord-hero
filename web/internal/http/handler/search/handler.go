package search

import (
	"net/http"

	"github.com/a-h/templ"

	"github.com/lyricapp/lyric/web/internal/web/components"
)

// Handler renders the search surface using templ components.
type Handler struct {
	component templ.Component
}

// New constructs a handler backed by the search component.
func New() *Handler {
	return &Handler{component: components.Search()}
}

// ServeHTTP delegates rendering to templ's HTTP bridge.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	templ.Handler(h.component).ServeHTTP(w, r)
}
