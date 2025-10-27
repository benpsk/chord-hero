package util

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/jwtauth/v5"
	"github.com/lyricapp/lyric/web/internal/apperror"
)

// CurrentUserID extracts the authenticated user's ID from the request context.
func CurrentUserID(r *http.Request) (int, error) {
	_, claims, err := jwtauth.FromContext(r.Context())
	if err != nil {
		return 0, apperror.Unauthorized("Unauthorized user")
	}

	raw, ok := claims["sub"]
	if !ok {
		return 0, apperror.Unauthorized("Unauthorized user")
	}

	switch value := raw.(type) {
	case string:
		idStr := strings.TrimSpace(value)
		if idStr == "" {
			return 0, apperror.Unauthorized("Unauthorized user")
		}
		id, convErr := strconv.Atoi(idStr)
		if convErr != nil || id <= 0 {
			return 0, apperror.Unauthorized("Unauthorized user")
		}
		return id, nil
	case float64:
		if value <= 0 {
			return 0, apperror.Unauthorized("Unauthorized user")
		}
		return int(value), nil
	default:
		return 0, apperror.Unauthorized("Unauthorized user")
	}
}
