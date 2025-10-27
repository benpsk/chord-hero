package testutil

import (
	"strconv"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	"github.com/lyricapp/lyric/web/internal/config"
	"github.com/lyricapp/lyric/web/internal/http/middleware/auth"
)

func AuthToken(t *testing.T, userID int) (*chi.Mux, string) {
	// Create a token
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}
	tokenAuth := jwtauth.New("HS256", []byte(cfg.Auth.TokenSecret), nil)

	claims := map[string]any{
		"sub": strconv.Itoa(userID),
		"typ": "access",
	}
	_, tokenString, _ := tokenAuth.Encode(claims)

	r := chi.NewRouter()
	r.Use(jwtauth.Verifier(tokenAuth))
	r.Use(auth.Authenticator(tokenAuth))

	return r, tokenString
}

