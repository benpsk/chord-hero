package apperror

import (
    "fmt"
    "net/http"
)

type AppError struct {
    Status  int            // The HTTP status code (e.g., 400, 404, 500)
    Message string         // The high-level, user-facing error message
    Err     error          // The original, internal error (for logging)
    Details map[string]string // Key-value pairs for validation errors
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}

// Unwrap allows errors.Is and errors.As to work
func (e *AppError) Unwrap() error {
    return e.Err
}

func New(status int, message string, err error) *AppError {
    return &AppError{
        Status:  status,
        Message: message,
        Err:     err,
    }
}

func Validation(message string, details map[string]string) *AppError {
    return &AppError{
        Status:  http.StatusUnprocessableEntity,
        Message: message,
        Details: details,
    }
}
func NotFound(message string) *AppError {
    return New(http.StatusNotFound, message, nil)
}
func BadRequest(message string) *AppError {
    return New(http.StatusBadRequest, message, nil)
}
func Unauthorized(message string) *AppError {
    return New(http.StatusUnauthorized, message, nil)
}
func Forbidden(message string) *AppError {
    return New(http.StatusForbidden, message, nil)
}
func Internal(message string, err error) *AppError {
    return New(http.StatusInternalServerError, message, err)
}
