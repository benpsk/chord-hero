package app

import (
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/config"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
	chordsvc "github.com/lyricapp/lyric/web/internal/services/chords"
	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
	healthsvc "github.com/lyricapp/lyric/web/internal/services/health"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
)

// Application wires dependencies together so transports remain thin.
type Application struct {
	Config   config.Config
	DB       *pgxpool.Pool
	Services Services
}

// Services aggregates domain services for easier handler composition.
type Services struct {
	Health      healthsvc.Service
	Songs       songsvc.Service
	Albums      albumsvc.Service
	Artists     artistsvc.Service
	Writers     writersvc.Service
	ReleaseYear releaseyearsvc.Service
	Playlists   playlistsvc.Service
	Trendings   trendingsvc.Service
	Chords      chordsvc.Service
	Feedback    feedbacksvc.Service
}

// New constructs a new Application instance with default implementations.
func New(cfg config.Config, db *pgxpool.Pool) *Application {
	return &Application{
		Config: cfg,
		DB:     db,
		Services: Services{
			Health:      healthsvc.NewService(db),
			Songs:       songsvc.NewService(db),
			Albums:      albumsvc.NewService(db),
			Artists:     artistsvc.NewService(db),
			Writers:     writersvc.NewService(db),
			ReleaseYear: releaseyearsvc.NewService(db),
			Playlists:   playlistsvc.NewService(db),
			Trendings:   trendingsvc.NewService(db),
			Chords:      chordsvc.NewService(db),
			Feedback:    feedbacksvc.NewService(db),
		},
	}
}
