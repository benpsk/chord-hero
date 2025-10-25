package app

import (
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	adminsession "github.com/lyricapp/lyric/web/internal/auth/admin"
	"github.com/lyricapp/lyric/web/internal/config"
	adminauthsvc "github.com/lyricapp/lyric/web/internal/services/adminauth"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
	chordsvc "github.com/lyricapp/lyric/web/internal/services/chords"
	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
	healthsvc "github.com/lyricapp/lyric/web/internal/services/health"
	languagesvc "github.com/lyricapp/lyric/web/internal/services/languages"
	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
	loginsvc "github.com/lyricapp/lyric/web/internal/services/login"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
	usersvc "github.com/lyricapp/lyric/web/internal/services/users"
	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
	adminrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/admin"
	albumrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/albums"
	artistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/artists"
	chordrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/chords"
	feedbackrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/feedback"
	healthrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/health"
	languagerepo "github.com/lyricapp/lyric/web/internal/storage/postgres/languages"
	levelrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/levels"
	loginrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/login"
	playlistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/playlists"
	releaseyearrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/releaseyear"
	songrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/songs"
	trendingrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/trending"
	usersrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/users"
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
	Languages   languagesvc.Service
	Login       loginsvc.Service
	Users       usersvc.Service
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
	languageRepository := languagerepo.NewRepository(db)
	loginRepository := loginrepo.NewRepository(db)
	userRepository := usersrepo.NewRepository(db)

	adminSessions := adminsession.NewManager(
		cfg.Admin.SessionCookie,
		[]byte(cfg.Admin.SessionSecret),
		cfg.Admin.SessionTTL,
		cfg.Admin.SessionSecure,
	)

	var loginMailer loginsvc.Mailer
	if strings.EqualFold(cfg.Api.AppEnv, "production") && cfg.Auth.SMTP.Host != "" && cfg.Auth.SMTP.From != "" {
		loginMailer = loginsvc.NewSMTPMailer(loginsvc.SMTPSettings{
			Host:     cfg.Auth.SMTP.Host,
			Port:     cfg.Auth.SMTP.Port,
			Username: cfg.Auth.SMTP.Username,
			Password: cfg.Auth.SMTP.Password,
			From:     cfg.Auth.SMTP.From,
		})
	} else {
		loginMailer = loginsvc.NewConsoleMailer(cfg.Auth.SMTP.From)
	}

	loginService := loginsvc.NewService(
		loginRepository,
		loginMailer,
		loginsvc.Config{
			CodeLength:  cfg.Auth.OTPLength,
			TTL:         cfg.Auth.OTPTTL,
			TokenSecret: cfg.Auth.TokenSecret,
			TokenTTL:    cfg.Auth.TokenTTL,
		},
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
			AdminAuth:    adminauthsvc.NewService(adminRepository),
			Levels:      levelsvc.NewService(levelRepository),
			Languages:   languagesvc.NewService(languageRepository),
			Login:       loginService,
			Users:       usersvc.NewService(userRepository),
		},
		AdminSessions: adminSessions,
	}
}
