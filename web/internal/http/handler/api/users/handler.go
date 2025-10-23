package users

import (
	"errors"
	"net/http"
	"strings"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
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
		switch {
		case errors.Is(err, usersvc.ErrEmailRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"email": "email is required"}})
			return
		default:
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to search users"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": users,
	})
}
