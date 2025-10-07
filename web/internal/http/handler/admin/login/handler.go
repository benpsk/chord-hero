package login

import (
	"net/http"
	"strings"

	"github.com/a-h/templ"

	adminsession "github.com/lyricapp/lyric/web/internal/auth/admin"
	adminctx "github.com/lyricapp/lyric/web/internal/http/context/admin"
	adminauthsvc "github.com/lyricapp/lyric/web/internal/services/adminauth"
	"github.com/lyricapp/lyric/web/internal/web/components"
)

const defaultRedirect = "/admin/song/create"

// Handler serves the admin login page and processes sign-in requests.
type Handler struct {
	auth     adminauthsvc.Service
	sessions *adminsession.Manager
}

// New constructs a login handler.
func New(auth adminauthsvc.Service, sessions *adminsession.Manager) *Handler {
	return &Handler{auth: auth, sessions: sessions}
}

// Show renders the login page; authenticated users are redirected to the dashboard.
func (h *Handler) Show(w http.ResponseWriter, r *http.Request) {
	if _, ok := adminctx.FromContext(r.Context()); ok {
		http.Redirect(w, r, defaultRedirect, http.StatusFound)
		return
	}

	redirectTarget := r.URL.Query().Get("redirect")
	props := components.AdminLoginProps{
		Username: "",
		Error:    "",
		Redirect: redirectTarget,
	}

	templ.Handler(components.AdminLoginPage(props)).ServeHTTP(w, r)
}

// Submit validates credentials and establishes the admin session.
func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid form submission", http.StatusBadRequest)
		return
	}

	username := strings.TrimSpace(r.FormValue("username"))
	password := r.FormValue("password")
	redirectTarget := safeRedirect(strings.TrimSpace(r.FormValue("redirect")))

	user, err := h.auth.Authenticate(r.Context(), username, password)
	if err != nil {
		props := components.AdminLoginProps{
			Username: username,
			Error:    "Invalid username or password.",
			Redirect: redirectTarget,
		}
		templ.Handler(components.AdminLoginPage(props)).ServeHTTP(w, r)
		return
	}

	claims := adminsession.Claims{ID: user.ID, Username: user.Username}
	if err := h.sessions.Issue(w, claims); err != nil {
		http.Error(w, "unable to establish session", http.StatusInternalServerError)
		return
	}

	if redirectTarget == "" {
		redirectTarget = defaultRedirect
	}

	http.Redirect(w, r, redirectTarget, http.StatusFound)
}

// Logout clears the admin session cookie.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	h.sessions.Clear(w)
	http.Redirect(w, r, "/admin/login", http.StatusFound)
}

func safeRedirect(target string) string {
	if target == "" {
		return ""
	}
	if strings.HasPrefix(target, "/") && !strings.HasPrefix(target, "//") {
		return target
	}
	return ""
}
