package feedback

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
)

// Repository provides Postgres-backed feedback persistence.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create stores a new feedback entry and returns the persisted record.
func (r *Repository) Create(ctx context.Context, input feedbacksvc.CreateInput) (feedbacksvc.Feedback, error) {
	var feedback feedbacksvc.Feedback

	query := `
        INSERT INTO feedbacks (user_id, message)
        VALUES ($1, $2)
        RETURNING id, message, created_at
    `

	if err := r.db.QueryRow(ctx, query, input.UserID, input.Message).Scan(&feedback.ID, &feedback.Message, &feedback.CreatedAt); err != nil {
		return feedbacksvc.Feedback{}, fmt.Errorf("create feedback: %w", err)
	}

	return feedback, nil
}
