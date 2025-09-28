package main

import (
	"context"
	"flag"
	"log"
	"time"

	"github.com/lyricapp/lyric/web/internal/config"
	"github.com/lyricapp/lyric/web/internal/storage/migrate"
	"github.com/lyricapp/lyric/web/internal/storage/postgres"
)

// The migration command executes raw SQL files (sorted lexicographically) against
// the target PostgreSQL database. Each file should contain a single statement;
// applied migrations are tracked in the schema_migrations table.
func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	var migrationsDir string
	flag.StringVar(&migrationsDir, "path", "db/migrations", "directory containing .sql migrations")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	pool, err := postgres.Connect(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	if err := migrate.EnsureTable(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	applied, err := migrate.Apply(ctx, pool, migrationsDir)
	if err != nil {
		log.Fatalf("migrate: %v", err)
	}

	if len(applied) == 0 {
		log.Println("migrate: no migrations applied")
		return
	}

	for _, name := range applied {
		log.Printf("migrate: applied %s", name)
	}
}
