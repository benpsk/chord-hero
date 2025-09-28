package app

import (
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/config"
	healthsvc "github.com/lyricapp/lyric/web/internal/services/health"
)

// Application wires dependencies together so transports remain thin.
type Application struct {
	Config   config.Config
	DB       *pgxpool.Pool
	Services Services
}

// Services aggregates domain services for easier handler composition.
type Services struct {
	Health healthsvc.Service
}

// New constructs a new Application instance with default implementations.
func New(cfg config.Config, db *pgxpool.Pool) *Application {
	return &Application{
		Config: cfg,
		DB:     db,
		Services: Services{
			Health: healthsvc.NewService(db),
		},
	}
}
