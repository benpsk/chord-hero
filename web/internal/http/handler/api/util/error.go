package util

import "fmt"

type ValidationError struct {
	Fields map[string]string
}
type BadRequestError struct {
	Message string
	Err     error
}
type UnauthorizedError struct {
	Message string
	Err     error
}
type ForbiddenError struct {
	Message string
	Err     error
}
type NotFoundError struct {
	Message string
	Err     error
}

func (e *NotFoundError) Unwrap() error     { return e.Err }
func (e *ForbiddenError) Unwrap() error    { return e.Err }
func (e *UnauthorizedError) Unwrap() error { return e.Err }
func (e *BadRequestError) Unwrap() error   { return e.Err }

func NewValidationError() *ValidationError {
	return &ValidationError{Fields: make(map[string]string)}
}
func (e *ValidationError) Error() string {
	return "validation error"
}
func (e *ValidationError) AddField(field, message string) {
	e.Fields[field] = message
}
func (e *ValidationError) HasErrors() bool {
	return len(e.Fields) > 0
}
func (ve *ValidationError) Err() error {
	if ve.HasErrors() {
		return ve
	}
	return nil
}

func (e *NotFoundError) Error() string {
	if e.Message == "" {
		return "the requested resource was not found"
	}
	return e.Message
}
func NewNotFoundError(message string, err error) *NotFoundError {
	return &NotFoundError{
		Message: message,
		Err:     err, 
	}
}

func (e *ForbiddenError) Error() string {
	return e.Message
}

func NewForbiddenError(message string, err error) *ForbiddenError {
	return &ForbiddenError{
		Message: fmt.Sprintf("%s: %v", message, err),
		Err:     err,
	}
}

func (e *UnauthorizedError) Error() string {
	if e.Message == "" {
		return "the requested is unauthorized"
	}
	return e.Message
}

func NewUnauthorizedError(message string, err error) *UnauthorizedError {
	return &UnauthorizedError{
		Message: fmt.Sprintf("%s: %v", message, err),
		Err:     err,
	}
}

func (e *BadRequestError) Error() string {
	if e.Message == "" {
		return "bad requested"
	}
	return e.Message
}

func NewBadRequestError(message string, err error) *BadRequestError {
	return &BadRequestError{
		Message: fmt.Sprintf("%s: %v", message, err),
		Err:     err,
	}
}
