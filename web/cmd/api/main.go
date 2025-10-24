package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	_ "github.com/joho/godotenv/autoload"
	"github.com/lyricapp/lyric/web/internal/app"
	"github.com/lyricapp/lyric/web/internal/config"
	"github.com/lyricapp/lyric/web/internal/http/router"
	"github.com/lyricapp/lyric/web/internal/server"
	"github.com/lyricapp/lyric/web/internal/storage/postgres"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := postgres.Connect(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	application := app.New(cfg, db)
	r := router.New(application)

	srv := server.New(cfg, r)

	log.Printf("Listening on %s", listenURL(cfg.HTTPAddr))

	if err := srv.Start(ctx); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func listenURL(addr string) string {
	if addr == "" {
		return "http://localhost:8080"
	}

	listen := addr

	if strings.HasPrefix(listen, ":") {
		listen = "localhost" + listen
	} else if strings.HasPrefix(listen, "0.0.0.0:") {
		listen = "localhost" + listen[len("0.0.0.0"):]
	}

	if !strings.Contains(listen, "://") {
		listen = "http://" + listen
	}

	return listen
}
