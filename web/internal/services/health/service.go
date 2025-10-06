package health

import (
	"context"
	"time"
)

// Service defines the health-check contract.
type Service interface {
	Status(context.Context) (Status, error)
}

// Status represents the health response body.
type Status struct {
	Status    string          `json:"status"`
	CheckedAt time.Time       `json:"checked_at"`
	Database  DatabaseDetails `json:"database"`
}

// DatabaseDetails captures the database connectivity state for observability.
type DatabaseDetails struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

// Repository abstracts the persistence-layer health check.
type Repository interface {
	Ping(ctx context.Context) error
}

type service struct {
	repo Repository
}

// NewService creates a healthy default implementation.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Status(ctx context.Context) (Status, error) {
	checkedAt := time.Now().UTC()

	status := Status{
		Status:    "ok",
		CheckedAt: checkedAt,
		Database: DatabaseDetails{
			Status: "ok",
		},
	}

	if s.repo == nil {
		status.Database.Status = "unconfigured"
		status.Database.Message = "database connection not initialised"
		status.Status = "degraded"
		return status, nil
	}

	if err := s.repo.Ping(ctx); err != nil {
		status.Database.Status = "error"
		status.Database.Message = err.Error()
		status.Status = "degraded"
		return status, nil
	}

	return status, nil
}
