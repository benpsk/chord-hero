package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/lyricapp/lyric/web/internal/apperror"
)

type PaginationResponse struct {
	Data    any `json:"data"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}

type Response[T any] struct {
	Data []T `json:"data"`
}
type ResponseMessage[T any] struct {
	Data T `json:"data"`
}
type PageResponse[T any] struct {
	Data    []T `json:"data"`
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}
type ErrorResponse[T any] struct {
	Errors T `json:"errors"`
}

func Error(w http.ResponseWriter, err error) {
	var appErr *apperror.AppError

	if errors.As(err, &appErr) {
		if appErr.Err != nil {
			log.Printf("Internal error: %v", appErr.Err)
		}
		responseBody := make(map[string]any)
		if appErr.Details != nil {
			responseBody["errors"] = appErr.Details
		} else {
			responseBody["errors"] = map[string]string{"message": appErr.Message}
		}
		toJSON(w, appErr.Status, responseBody)
	} else {
		log.Printf("Unexpected error: %v", err)
		responseBody := map[string]any{
			"errors": map[string]string{"message": "an unexpected internal error occurred"},
		}
		toJSON(w, http.StatusInternalServerError, responseBody)
	}
}

func Success(w http.ResponseWriter, code int, payload any) {
	var envelope any

	switch v := payload.(type) {
	case string:
		envelope = map[string]any{"message": v}
		return
	case PaginationResponse:
		envelope = payload
	default:
		envelope = map[string]any{"data": payload}
	}
	toJSON(w, code, envelope)
}

func toJSON(w http.ResponseWriter, code int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("ERROR: could not marshal JSON response: %v", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write(body)
}
