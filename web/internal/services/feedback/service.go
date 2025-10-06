package feedback

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
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

type service struct {
	db *pgxpool.Pool
}

// NewService builds the default feedback service.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) Create(ctx context.Context, input CreateInput) (Feedback, error) {
	message := strings.TrimSpace(input.Message)
	if message == "" {
		return Feedback{}, fmt.Errorf("message is required")
	}
	if input.UserID <= 0 {
		return Feedback{}, fmt.Errorf("user_id is required")
	}

	var feedback Feedback

	query := `
        INSERT INTO feedbacks (user_id, message)
        VALUES ($1, $2)
        RETURNING id, message, created_at
    `

	if err := s.db.QueryRow(ctx, query, input.UserID, message).Scan(&feedback.ID, &feedback.Message, &feedback.CreatedAt); err != nil {
		return Feedback{}, fmt.Errorf("create feedback: %w", err)
	}

	return feedback, nil
}
