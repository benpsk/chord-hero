package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/lyricapp/lyric/web/internal/app"
	adminloginhandler "github.com/lyricapp/lyric/web/internal/http/handler/admin/login"
	adminsonghandler "github.com/lyricapp/lyric/web/internal/http/handler/admin/song"
	albumsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/albums"
	artistsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/artists"
	chordsapi "github.com/lyricapp/lyric/web/internal/http/handler/api/chords"
	feedbackapi "github.com/lyricapp/lyric/web/internal/http/handler/api/feedback"
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
)

// New instantiates the HTTP router and wires up handlers and middleware.
func New(application *app.Application) chi.Router {
	r := chi.NewRouter()

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
	adminSong := adminsonghandler.New(application.Services.Songs, application.Services.Albums, application.Services.Artists, application.Services.Writers)
	adminMiddleware := adminmw.Middleware{Sessions: application.AdminSessions, LoginPath: "/admin/login"}

	r.Route("/admin", func(admin chi.Router) {
		admin.Use(adminMiddleware.WithUser)

		admin.Get("/login", adminLogin.Show)
		admin.Post("/login", adminLogin.Submit)

		admin.Group(func(protected chi.Router) {
			protected.Use(adminMiddleware.Require)
			protected.Get("/song/create", adminSong.Show)
			protected.Post("/song/create", adminSong.Create)
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
	apiChords := chordsapi.New(application.Services.Chords)
	apiFeedback := feedbackapi.New(application.Services.Feedback)
	r.Route("/api", func(api chi.Router) {
		api.Get("/songs", apiSongs.List)
		api.Get("/albums", apiAlbums.List)
		api.Get("/artists", apiArtists.List)
		api.Get("/writers", apiWriters.List)
		api.Get("/release-year", apiReleaseYear.List)
		api.Get("/playlists", apiPlaylists.List)
		api.Get("/trending-songs", apiTrending.List)
		api.Get("/trending-albums", apiTrending.Albums)
		api.Get("/trending-artists", apiTrending.Artists)
		api.Get("/chords/{name}", apiChords.Show)
		api.Post("/feedback", apiFeedback.Create)
	})

	return r
}
