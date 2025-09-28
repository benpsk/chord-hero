package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/lyricapp/lyric/web/internal/app"
	healthhandler "github.com/lyricapp/lyric/web/internal/http/handler/health"
	homehandler "github.com/lyricapp/lyric/web/internal/http/handler/home"
)

// New instantiates the HTTP router and wires up handlers and middleware.
func New(application *app.Application) chi.Router {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	health := healthhandler.New(application.Services.Health)
	r.Get("/health", health.Live)

	home := homehandler.New()
	r.Handle("/", home)

	return r
}
