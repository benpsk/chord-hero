package home

import (
	"net/http"

	"github.com/a-h/templ"
	"github.com/lyricapp/lyric/web/internal/web/components"
)

// Handler renders the root landing page using templ components.
type Handler struct {
	component templ.Component
}

// New constructs a handler preloaded with the default home component.
func New() *Handler {
	return &Handler{component: components.Home()}
}

// ServeHTTP delegates rendering to templ's HTTP handler helper.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	templ.Handler(h.component).ServeHTTP(w, r)
}
