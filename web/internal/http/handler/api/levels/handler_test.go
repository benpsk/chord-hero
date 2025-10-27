package levels_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/levels"
	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
	"github.com/lyricapp/lyric/web/internal/storage"
	levelrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/levels"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(storage storage.Querier) levels.Handler {
	repo := levelrepo.NewRepository(storage)
	svc := levelsvc.NewService(repo)
	return levels.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	_, err := tx.Exec(ctx, "insert into levels (name) values ('Easy'), ('Medium'), ('Hard')")
	if err != nil {
		t.Fatalf("failed to seed levels table: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/levels", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("h returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var res handler.Response[levelsvc.Level]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) != 3 {
		t.Fatalf("data mot match")
	}
}
