package migrate

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const migrationsTable = "schema_migrations"

// EnsureTable creates the bookkeeping table required to track applied migrations.
func EnsureTable(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
        create table if not exists schema_migrations (
            name text primary key,
            applied_at timestamptz not null default now()
        )
    `)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}
	return nil
}

// Apply executes unapplied .sql files found in dir, ordered lexicographically.
// Each file is executed inside a transaction; files should contain a single SQL
// statement compatible with PostgreSQL's extended protocol.
func Apply(ctx context.Context, pool *pgxpool.Pool, dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, fmt.Errorf("migrations directory %q not found", dir)
		}
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}

	sort.Strings(files)

	var applied []string

	for _, name := range files {
		alreadyApplied, err := migrationApplied(ctx, pool, name)
		if err != nil {
			return applied, err
		}
		if alreadyApplied {
			continue
		}

		path := filepath.Join(dir, name)
		contents, err := os.ReadFile(path)
		if err != nil {
			return applied, fmt.Errorf("read %s: %w", name, err)
		}
		statement := strings.TrimSpace(string(contents))
		if statement == "" {
			if err := recordMigration(ctx, pool, name); err != nil {
				return applied, err
			}
			applied = append(applied, name)
			continue
		}

		if err := runMigration(ctx, pool, name, statement); err != nil {
			return applied, err
		}

		applied = append(applied, name)
	}

	return applied, nil
}

func migrationApplied(ctx context.Context, pool *pgxpool.Pool, name string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `select exists (select 1 from schema_migrations where name = $1)`, name).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check migration %s: %w", name, err)
	}
	return exists, nil
}

func runMigration(ctx context.Context, pool *pgxpool.Pool, name, statement string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", name, err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck - safe to ignore rollback errors

	if _, err := tx.Exec(ctx, statement); err != nil {
		return fmt.Errorf("exec migration %s: %w", name, err)
	}

	if err := recordMigrationTx(ctx, tx, name); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit migration %s: %w", name, err)
	}

	return nil
}

func recordMigration(ctx context.Context, pool *pgxpool.Pool, name string) error {
	if _, err := pool.Exec(ctx, `insert into schema_migrations (name) values ($1)`, name); err != nil {
		return fmt.Errorf("record migration %s: %w", name, err)
	}
	return nil
}

func recordMigrationTx(ctx context.Context, tx pgx.Tx, name string) error {
	if _, err := tx.Exec(ctx, `insert into schema_migrations (name) values ($1)`, name); err != nil {
		return fmt.Errorf("record migration %s: %w", name, err)
	}
	return nil
}
