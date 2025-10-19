package app

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	adminsession "github.com/lyricapp/lyric/web/internal/auth/admin"
	"github.com/lyricapp/lyric/web/internal/config"
	adminauthsvc "github.com/lyricapp/lyric/web/internal/services/adminauth"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
	chordsvc "github.com/lyricapp/lyric/web/internal/services/chords"
	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
	healthsvc "github.com/lyricapp/lyric/web/internal/services/health"
	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
	adminrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/admin"
	albumrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/albums"
	artistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/artists"
	chordrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/chords"
	feedbackrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/feedback"
	healthrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/health"
	levelrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/levels"
	playlistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/playlists"
	releaseyearrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/releaseyear"
	songrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/songs"
	trendingrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/trending"
	writerrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/writers"
)

// Application wires dependencies together so transports remain thin.
type Application struct {
	Config        config.Config
	DB            *pgxpool.Pool
	Services      Services
	AdminSessions *adminsession.Manager
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
	AdminAuth   adminauthsvc.Service
	Levels      levelsvc.Service
}

// New constructs a new Application instance with default implementations.
func New(cfg config.Config, db *pgxpool.Pool) *Application {
	songRepository := songrepo.NewRepository(db)
	albumRepository := albumrepo.NewRepository(db)
	artistRepository := artistrepo.NewRepository(db)
	writerRepository := writerrepo.NewRepository(db)
	releaseYearRepository := releaseyearrepo.NewRepository(db)
	playlistRepository := playlistrepo.NewRepository(db)
	trendingRepository := trendingrepo.NewRepository(db)
	chordRepository := chordrepo.NewRepository(db)
	feedbackRepository := feedbackrepo.NewRepository(db)
	healthRepository := healthrepo.NewRepository(db)
	adminRepository := adminrepo.NewRepository(db)
	levelRepository := levelrepo.NewRepository(db)

	adminAuthRepository := adminAuthRepoAdapter{repo: adminRepository}
	adminAuthService := adminauthsvc.NewService(adminAuthRepository)
	adminSessions := adminsession.NewManager(
		cfg.Admin.SessionCookie,
		[]byte(cfg.Admin.SessionSecret),
		cfg.Admin.SessionTTL,
		cfg.Admin.SessionSecure,
	)

	return &Application{
		Config: cfg,
		DB:     db,
		Services: Services{
			Health:      healthsvc.NewService(healthRepository),
			Songs:       songsvc.NewService(songRepository),
			Albums:      albumsvc.NewService(albumRepository),
			Artists:     artistsvc.NewService(artistRepository),
			Writers:     writersvc.NewService(writerRepository),
			ReleaseYear: releaseyearsvc.NewService(releaseYearRepository),
			Playlists:   playlistsvc.NewService(playlistRepository),
			Trendings:   trendingsvc.NewService(trendingRepository),
			Chords:      chordsvc.NewService(chordRepository),
			Feedback:    feedbacksvc.NewService(feedbackRepository),
			AdminAuth:   adminAuthService,
			Levels:      levelsvc.NewService(levelRepository),
		},
		AdminSessions: adminSessions,
	}
}

type adminAuthRepoAdapter struct {
	repo *adminrepo.Repository
}

func (a adminAuthRepoAdapter) FindByUsername(ctx context.Context, username string) (adminauthsvc.Credential, error) {
	user, err := a.repo.FindByUsername(ctx, username)
	if err != nil {
		return adminauthsvc.Credential{}, err
	}
	return adminauthsvc.Credential{
		ID:           user.ID,
		Username:     user.Username,
		PasswordHash: user.PasswordHash,
	}, nil
}
