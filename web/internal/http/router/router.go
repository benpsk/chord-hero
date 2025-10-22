package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/jwtauth/v5"

	"github.com/lyricapp/lyric/web/internal/app"
	adminloginhandler "github.com/lyricapp/lyric/web/internal/http/handler/admin/login"
	adminsonghandler "github.com/lyricapp/lyric/web/internal/http/handler/admin/song"
	albumsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/albums"
	artistsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/artists"
	chordsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/chords"
	feedbackapi "github.com/lyricapp/lyric/web/internal/http/handler/api/feedback"
	levelsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/levels"
	languagesapi "github.com/lyricapp/lyric/web/internal/http/handler/api/languages"
	loginapi "github.com/lyricapp/lyric/web/internal/http/handler/api/login"
	playlistsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/playlists"
	releaseyearapi "github.com/lyricapp/lyric/web/internal/http/handler/api/releaseyear"
	songsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/songs"
	trendingapi "github.com/lyricapp/lyric/web/internal/http/handler/api/trending"
	writersapi "github.com/lyricapp/lyric/web/internal/http/handler/api/writers"
	chartshandler "github.com/lyricapp/lyric/web/internal/http/handler/charts"
	healthhandler "github.com/lyricapp/lyric/web/internal/http/handler/health"
	homehandler "github.com/lyricapp/lyric/web/internal/http/handler/home"
	libraryhandler "github.com/lyricapp/lyric/web/internal/http/handler/library"
	searchhandler "github.com/lyricapp/lyric/web/internal/http/handler/search"
	songspagehandler "github.com/lyricapp/lyric/web/internal/http/handler/songs"
	adminmw "github.com/lyricapp/lyric/web/internal/http/middleware/adminauth"
	authmw "github.com/lyricapp/lyric/web/internal/http/middleware/auth"
)

// New instantiates the HTTP router and wires up handlers and middleware.
func New(application *app.Application) chi.Router {
	r := chi.NewRouter()

	var allowedOrigins []string
	if application.Config.Api.AppEnv == "production" {
		allowedOrigins = []string{application.Config.Api.FrontendUrl}
	} else {
		allowedOrigins = []string{"*"}
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	health := healthhandler.New(application.Services.Health)
	r.Get("/health", health.Live)

	home := homehandler.New()
	r.Handle("/", home)

	charts := chartshandler.New()
	r.Handle("/charts/{id}", charts)

	search := searchhandler.New()
	r.Handle("/search", search)

	library := libraryhandler.New()
	r.Handle("/library", library)

	songs := songspagehandler.New()
	r.Handle("/songs/{id}", songs)

	adminLogin := adminloginhandler.New(application.Services.AdminAuth, application.AdminSessions)
	adminSong := adminsonghandler.New(application.Services.Songs, application.Services.Albums, application.Services.Artists, application.Services.Writers, application.Services.Levels)
	adminMiddleware := adminmw.Middleware{Sessions: application.AdminSessions, LoginPath: "/admin/login"}

	r.Route("/admin", func(admin chi.Router) {
		admin.Use(adminMiddleware.WithUser)

		admin.Get("/login", adminLogin.Show)
		admin.Post("/login", adminLogin.Submit)

		admin.Group(func(protected chi.Router) {
			protected.Use(adminMiddleware.Require)
			protected.Get("/songs", adminSong.Index)
			protected.Get("/songs/create", adminSong.Show)
			protected.Post("/songs/create", adminSong.Create)
			protected.Get("/songs/{id}/edit", adminSong.Edit)
			protected.Post("/songs/{id}/edit", adminSong.Update)
			protected.Post("/songs/{id}/delete", adminSong.Delete)
			protected.Post("/logout", adminLogin.Logout)
		})
	})

	apiSongs := songsapi.New(application.Services.Songs)
	apiAlbums := albumsapi.New(application.Services.Albums)
	apiArtists := artistsapi.New(application.Services.Artists)
	apiWriters := writersapi.New(application.Services.Writers)
	apiReleaseYear := releaseyearapi.New(application.Services.ReleaseYear)
	apiPlaylists := playlistsapi.New(application.Services.Playlists)
	apiTrending := trendingapi.New(application.Services.Trendings)
	apiLevels := levelsapi.New(application.Services.Levels)
	apiLanguages := languagesapi.New(application.Services.Languages)
	apiChords := chordsapi.New(application.Services.Chords)
	apiFeedback := feedbackapi.New(application.Services.Feedback)
	apiLogin := loginapi.New(application.Services.Login)
	tokenAuth := application.Services.Login.TokenAuth()
	r.Route("/api", func(api chi.Router) {
		api.Post("/login", apiLogin.Request)
		api.Post("/code", apiLogin.Verify)
		api.Group(func(protected chi.Router) {
			protected.Use(jwtauth.Verifier(tokenAuth))
			protected.Use(authmw.Authenticator(tokenAuth))
			protected.Post("/me", apiLogin.Me)
			protected.Post("/songs", apiSongs.Create)
			protected.Get("/playlists", apiPlaylists.List)
			protected.Post("/playlists/create", apiPlaylists.Create)
			protected.Post("/playlists/{playlist_id}/songs/{song_ids}", apiPlaylists.AddSongs)
			protected.Post("/feedback", apiFeedback.Create)
			protected.Post("/songs/{song_id}/levels/{level_id}", apiSongs.AssignLevel)
		})
		api.Get("/songs", apiSongs.List)
		api.Get("/albums", apiAlbums.List)
		api.Get("/artists", apiArtists.List)
		api.Get("/writers", apiWriters.List)
		api.Get("/release-year", apiReleaseYear.List)
		api.Get("/trending-songs", apiTrending.List)
		api.Get("/trending-albums", apiTrending.Albums)
		api.Get("/trending-artists", apiTrending.Artists)
		api.Get("/levels", apiLevels.List)
		api.Get("/languages", apiLanguages.List)
		api.Get("/chords/{name}", apiChords.Show)
	})

	return r
}
