package server

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/lyricapp/lyric/web/internal/config"
)

// Server is a thin wrapper around http.Server that manages graceful shutdowns.
type Server struct {
	httpServer      *http.Server
	shutdownTimeout time.Duration
}

// New builds a Server using the provided configuration and router.
func New(cfg config.Config, handler http.Handler) *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:    cfg.HTTPAddr,
			Handler: handler,
		},
		shutdownTimeout: cfg.ShutdownTimeout,
	}
}

// Start begins serving HTTP traffic and blocks until the context is cancelled.
func (s *Server) Start(ctx context.Context) error {
	errCh := make(chan error, 1)

	go func() {
		if err := s.httpServer.ListenAndServe(); err != nil {
			if !errors.Is(err, http.ErrServerClosed) {
				errCh <- err
				return
			}
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout)
		defer cancel()
		if err := s.httpServer.Shutdown(shutdownCtx); err != nil {
			return err
		}
		return nil
	case err := <-errCh:
		// errCh only closes when ListenAndServe exits; nil indicates clean shutdown.
		return err
	}
}
