package util

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/jwtauth/v5"
)

// ErrUnauthorized indicates no authenticated user could be determined from the request context.
var ErrUnauthorized = errors.New("unauthorized")

// CurrentUserID extracts the authenticated user's ID from the request context.
func CurrentUserID(r *http.Request) (int, error) {
	_, claims, err := jwtauth.FromContext(r.Context())
	if err != nil {
		return 0, ErrUnauthorized
	}

	raw, ok := claims["sub"]
	if !ok {
		return 0, ErrUnauthorized
	}

	switch value := raw.(type) {
	case string:
		idStr := strings.TrimSpace(value)
		if idStr == "" {
			return 0, ErrUnauthorized
		}
		id, convErr := strconv.Atoi(idStr)
		if convErr != nil || id <= 0 {
			return 0, ErrUnauthorized
		}
		return id, nil
	case float64:
		if value <= 0 {
			return 0, ErrUnauthorized
		}
		return int(value), nil
	default:
		return 0, ErrUnauthorized
	}
}

