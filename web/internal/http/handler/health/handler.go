package health

import (
	"encoding/json"
	"net/http"

	healthsvc "github.com/lyricapp/lyric/web/internal/services/health"
)

// Handler exposes health endpoints backed by the health service.
type Handler struct {
	svc healthsvc.Service
}

// New wires a health service into a handler instance.
func New(svc healthsvc.Service) Handler {
	return Handler{svc: svc}
}

// Live responds with a simple JSON payload indicating the API is online.
func (h Handler) Live(w http.ResponseWriter, r *http.Request) {
	status, err := h.svc.Status(r.Context())
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
}
