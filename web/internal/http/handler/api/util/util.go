package util

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// ParseOptionalPositiveInt returns a pointer to a positive integer or records a validation error.
func ParseOptionalPositiveInt(raw, field string, errs map[string]string) *int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		errs[field] = "must be a positive integer"
		return nil
	}

	return &value
}

// ParseOptionalInt returns a pointer to an integer or records a validation error.
func ParseOptionalInt(raw, field string, errs map[string]string) *int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		errs[field] = "must be an integer"
		return nil
	}

	return &value
}

// ParseOptionalSearch trims the search query parameter.
func ParseOptionalSearch(raw string) string {
	return strings.TrimSpace(raw)
}

// RespondJSON writes a JSON response with the provided status code.
func RespondJSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
