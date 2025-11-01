package users

import (
	"net/http"

	"github.com/a-h/templ"
	adminctx "github.com/lyricapp/lyric/web/internal/http/context/admin"
	usersvc "github.com/lyricapp/lyric/web/internal/services/users"
	"github.com/lyricapp/lyric/web/internal/web/components"
)

// Handler serves the admin user list.
type Handler struct {
	users usersvc.Service
}

// New constructs a user admin handler.
func New(users usersvc.Service) *Handler {
	return &Handler{users: users}
}

// Index renders the admin user list.
func (h *Handler) Index(w http.ResponseWriter, r *http.Request) {
	user, ok := adminctx.FromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	users, err := h.users.List(r.Context())
	if err != nil {
		http.Error(w, "failed to load users", http.StatusInternalServerError)
		return
	}

	props := components.AdminUserListProps{
		Users:       users,
		CurrentUser: user.Username,
	}

	templ.Handler(components.AdminUserListPage(props)).ServeHTTP(w, r)
}
