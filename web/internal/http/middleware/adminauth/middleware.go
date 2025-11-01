package adminauth

import (
	"net/http"

	adminsession "github.com/lyricapp/lyric/web/internal/auth/admin"
	adminctx "github.com/lyricapp/lyric/web/internal/http/context/admin"
)

// Middleware wires admin session validation into HTTP handlers.
type Middleware struct {
	Sessions  *adminsession.Manager
	LoginPath string
}

// WithUser attaches the admin user to the request context when a valid session exists.
func (m Middleware) WithUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if claims, err := m.Sessions.Validate(r); err == nil {
			ctx := adminctx.WithUser(r.Context(), adminctx.User{ID: claims.ID, Username: claims.Username, Role: claims.Role})
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		} else if err == adminsession.ErrInvalidSession {
			m.Sessions.Clear(w)
		}

		next.ServeHTTP(w, r)
	})
}

// Require blocks access unless the request contains a valid admin session.
func (m Middleware) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := m.Sessions.Validate(r)
		if err != nil {
			if err == adminsession.ErrInvalidSession {
				m.Sessions.Clear(w)
			}
			http.Redirect(w, r, m.loginPath(), http.StatusFound)
			return
		}

		ctx := adminctx.WithUser(r.Context(), adminctx.User{ID: claims.ID, Username: claims.Username, Role: claims.Role})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m Middleware) loginPath() string {
	if m.LoginPath != "" {
		return m.LoginPath
	}
	return "/admin/login"
}
