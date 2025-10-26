package users

import (
	"net/http"
	"strings"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	usersvc "github.com/lyricapp/lyric/web/internal/services/users"
)

// Handler exposes user search endpoints.
type Handler struct {
	svc usersvc.Service
}

// New wires the users service into a handler instance.
func New(svc usersvc.Service) Handler {
	return Handler{svc: svc}
}

// Search handles POST /api/users?email=... to find matches by email.
func (h Handler) Search(w http.ResponseWriter, r *http.Request) {
	email := strings.TrimSpace(r.URL.Query().Get("email"))
	users, err := h.svc.SearchByEmail(r.Context(), email)
	if err != nil {
		handler.Error(w, err)
		return
	}
	handler.Success(w, http.StatusOK, users)
}
