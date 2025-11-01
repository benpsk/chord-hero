package login

import (
	"net/http"
	"strings"

	"github.com/a-h/templ"
	adminsession "github.com/lyricapp/lyric/web/internal/auth/admin"
	adminctx "github.com/lyricapp/lyric/web/internal/http/context/admin"
	loginsvc "github.com/lyricapp/lyric/web/internal/services/login"
	"github.com/lyricapp/lyric/web/internal/web/components"
)

const defaultRedirect = "/admin/songs"

// Handler serves the admin login page and processes sign-in requests.
type Handler struct {
	login    loginsvc.Service
	sessions *adminsession.Manager
}

// New constructs a login handler.
func New(login loginsvc.Service, sessions *adminsession.Manager) *Handler {
	return &Handler{login: login, sessions: sessions}
}

// Show renders the login page; authenticated users are redirected to the dashboard.
func (h *Handler) Show(w http.ResponseWriter, r *http.Request) {
	if _, ok := adminctx.FromContext(r.Context()); ok {
		http.Redirect(w, r, defaultRedirect, http.StatusFound)
		return
	}

	redirectTarget := r.URL.Query().Get("redirect")
	props := components.AdminLoginProps{
		Email:    "",
		Error:    "",
		Redirect: redirectTarget,
	}

	templ.Handler(components.AdminLoginPage(props)).ServeHTTP(w, r)
}

// Request validates credentials and establishes the admin session.
func (h *Handler) Request(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid form submission", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	redirectTarget := safeRedirect(strings.TrimSpace(r.FormValue("redirect")))

	if err := h.login.RequestOTP(r.Context(), email); err != nil {
		props := components.AdminLoginProps{
			Email:    email,
			Error:    "Can't process your request now",
			Redirect: redirectTarget,
		}
		templ.Handler(components.AdminLoginPage(props)).ServeHTTP(w, r)
		return
	}

	props := components.AdminVerifyProps{
		Email:    email,
		Error:    "",
		Redirect: redirectTarget,
	}

	templ.Handler(components.AdminVerifyPage(props)).ServeHTTP(w, r)
}

// Verify validates credentials and establishes the admin session.
func (h *Handler) Verify(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid form submission", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	code := strings.TrimSpace(r.FormValue("code"))
	redirectTarget := safeRedirect(strings.TrimSpace(r.FormValue("redirect")))

	result, err := h.login.VerifyCode(r.Context(), code)
	if err != nil {
		props := components.AdminVerifyProps{
			Email:    email,
			Error:    "Invalid code.",
			Redirect: redirectTarget,
		}
		templ.Handler(components.AdminVerifyPage(props)).ServeHTTP(w, r)
		return
	}

	if result.User.Role != "admin" && result.User.Role != "editor" {
		props := components.AdminLoginProps{
			Email:    email,
			Error:    "You don't have permission to access this page",
			Redirect: redirectTarget,
		}
		templ.Handler(components.AdminLoginPage(props)).ServeHTTP(w, r)
		return
	}

	claims := adminsession.Claims{ID: result.User.ID, Username: result.User.Email, Role: result.User.Role}
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
