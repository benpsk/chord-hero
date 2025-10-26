package auth

import (
	"net/http"

	"github.com/go-chi/jwtauth/v5"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"github.com/lyricapp/lyric/web/internal/http/handler"
)

// Authenticator returns middleware that enforces JWT presence and validity,
// responding with a JSON error when authentication fails.
func Authenticator(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, _, err := jwtauth.FromContext(r.Context())
			if err != nil || token == nil {
				handler.Error(w, apperror.Unauthorized("unauthorized"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
