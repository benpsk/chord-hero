package health_test

import (
	"context"
	"testing"

	"github.com/lyricapp/lyric/web/internal/services/health"
	healthrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/health"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func TestHealthService_Status(t *testing.T) {
	// given
	ctx := context.Background()
	db := testutil.SetupDB(t)
	defer db.Close()

	repo := healthrepo.NewRepository(db)
	service := health.NewService(repo)

	// when
	status, err := service.Status(ctx)

	// then
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status.Status != "ok" {
		t.Errorf("expected status to be 'ok', got %v", status.Status)
	}
	if status.Database.Status != "ok" {
		t.Errorf("expected database status to be 'ok', got %v", status.Database.Status)
	}
}
