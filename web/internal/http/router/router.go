package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/lyricapp/lyric/web/internal/app"
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

	return r
}
