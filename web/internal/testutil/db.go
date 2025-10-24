package testutil

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/lyricapp/lyric/web/internal/config"
	"github.com/lyricapp/lyric/web/internal/storage/postgres"
)

func SetupDB(t *testing.T) *pgxpool.Pool {
	projectRoot := ProjectRoot()
	err := godotenv.Load(filepath.Join(projectRoot, ".env.test"))
	if err != nil {
		t.Fatalf("failed to load .env.test: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	db, err := postgres.Connect(context.Background(), cfg.Database)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	return db
}
