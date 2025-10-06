package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func parseOptionalPositiveInt(raw string, field string, errs map[string]string) *int {
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

func parseOptionalInt(raw string, field string, errs map[string]string) *int {
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

func parseOptionalSearch(raw string) string {
	return strings.TrimSpace(raw)
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
