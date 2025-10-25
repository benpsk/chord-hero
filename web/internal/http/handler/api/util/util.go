package util

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// ParseOptionalPositiveInt returns a pointer to a positive integer or records a validation error.
func ParseOptionalPositiveInt(raw, field string, errs *ValidationError) *int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		errs.AddField(field, "must be a positive integer")
		return nil
	}

	return &value
}

// ParseOptionalInt returns a pointer to an integer or records a validation error.
func ParseOptionalInt(raw, field string, errs *ValidationError) *int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		errs.AddField(field, "must be an integer")
		return nil
	}

	return &value
}

// ParseOptionalSearch trims the search query parameter.
func ParseOptionalSearch(raw string) string {
	return strings.TrimSpace(raw)
}

// RespondJSONOld writes a JSON response with the provided status code.
func RespondJSONOld(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

type PaginationResponse struct {
	Data    any `json:"data"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}
type Response struct {
	Data   any `json:"data,omitempty"`
	Errors any `json:"errors,omitempty"`
}

func RespondJSON(w http.ResponseWriter, code int, payload any) {
	var envelope any
	switch v := payload.(type) {
	case *ValidationError:
		envelope = Response{Errors: v.Fields}
	case error:
		envelope = Response{Errors: map[string]any{"message": v.Error()}}
	case PaginationResponse:
		envelope = payload
	default:
		envelope = Response{Data: payload}
	}
	body, err := json.Marshal(envelope)
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	// always set the status after marshal
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write(body)
}

func RespondError(w http.ResponseWriter, err error) {
	var notFoundErr *NotFoundError
	var forbiddenErr *ForbiddenError
	var badRequestErr *BadRequestError
	var validationErr *ValidationError
	var unauthorizedErr *UnauthorizedError

	// Use a 'switch true' statement
	switch true {
	case errors.As(err, &notFoundErr):
		log.Println(notFoundErr.Unwrap())
		RespondJSON(w, http.StatusNotFound, notFoundErr)
	case errors.As(err, &forbiddenErr):
		log.Println(forbiddenErr.Unwrap())
		RespondJSON(w, http.StatusForbidden, forbiddenErr)
	case errors.As(err, &badRequestErr):
		log.Println(badRequestErr.Unwrap())
		RespondJSON(w, http.StatusBadRequest, badRequestErr)
	case errors.As(err, &unauthorizedErr):
		log.Println(unauthorizedErr.Unwrap())
		RespondJSON(w, http.StatusUnauthorized, unauthorizedErr)
	case errors.As(err, &validationErr):
		RespondJSON(w, http.StatusUnprocessableEntity, validationErr)
	default:
		log.Println("Unhandled error:", err)
		RespondJSON(w, http.StatusInternalServerError, errors.New("Internal server error"))
	}
}
