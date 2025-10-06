package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/lyricapp/lyric/web/internal/app"
	apihandler "github.com/lyricapp/lyric/web/internal/http/handler/api"
	chartshandler "github.com/lyricapp/lyric/web/internal/http/handler/charts"
	healthhandler "github.com/lyricapp/lyric/web/internal/http/handler/health"
	homehandler "github.com/lyricapp/lyric/web/internal/http/handler/home"
	libraryhandler "github.com/lyricapp/lyric/web/internal/http/handler/library"
	searchhandler "github.com/lyricapp/lyric/web/internal/http/handler/search"
	songshandler "github.com/lyricapp/lyric/web/internal/http/handler/songs"
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

	songs := songshandler.New()
	r.Handle("/songs/{id}", songs)

	apiSongs := apihandler.NewSongsHandler(application.Services.Songs)
	apiAlbums := apihandler.NewAlbumsHandler(application.Services.Albums)
	apiArtists := apihandler.NewArtistsHandler(application.Services.Artists)
	apiWriters := apihandler.NewWritersHandler(application.Services.Writers)
	apiReleaseYear := apihandler.NewReleaseYearHandler(application.Services.ReleaseYear)
	apiPlaylists := apihandler.NewPlaylistsHandler(application.Services.Playlists)
	apiTrending := apihandler.NewTrendingHandler(application.Services.Trendings)
	apiChords := apihandler.NewChordsHandler(application.Services.Chords)
	apiFeedback := apihandler.NewFeedbackHandler(application.Services.Feedback)
	r.Route("/api", func(api chi.Router) {
		api.Get("/songs", apiSongs.List)
		api.Get("/albums", apiAlbums.List)
		api.Get("/artists", apiArtists.List)
		api.Get("/writers", apiWriters.List)
		api.Get("/release-year", apiReleaseYear.List)
		api.Get("/playlists", apiPlaylists.List)
		api.Get("/trendings", apiTrending.List)
		api.Get("/trending-albums", apiTrending.Albums)
		api.Get("/trending-artists", apiTrending.Artists)
		api.Get("/chords/{name}", apiChords.Show)
		api.Post("/feedback", apiFeedback.Create)
	})

	return r
}
