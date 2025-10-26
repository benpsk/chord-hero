package util

import (
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

