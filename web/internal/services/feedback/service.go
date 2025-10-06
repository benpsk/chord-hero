package feedback

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// Service provides feedback submission.
type Service interface {
	Create(ctx context.Context, input CreateInput) (Feedback, error)
}

// CreateInput encapsulates the request payload for new feedback.
type CreateInput struct {
	UserID  int
	Message string
}

// Feedback represents the stored feedback response.
type Feedback struct {
	ID        int       `json:"id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

// Repository abstracts persistence for feedback entries.
type Repository interface {
	Create(ctx context.Context, input CreateInput) (Feedback, error)
}

type service struct {
	repo Repository
}

// NewService builds the default feedback service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(ctx context.Context, input CreateInput) (Feedback, error) {
	input.Message = strings.TrimSpace(input.Message)
	if input.Message == "" {
		return Feedback{}, fmt.Errorf("message is required")
	}
	if input.UserID <= 0 {
		return Feedback{}, fmt.Errorf("user_id is required")
	}

	return s.repo.Create(ctx, input)
}
