package languages_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/languages"
	languagesvc "github.com/lyricapp/lyric/web/internal/services/languages"
	"github.com/lyricapp/lyric/web/internal/storage"
	languagerepo "github.com/lyricapp/lyric/web/internal/storage/postgres/languages"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(storage storage.Querier) languages.Handler {
	repo := languagerepo.NewRepository(storage)
	svc := languagesvc.NewService(repo)
	return languages.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	_, err := tx.Exec(ctx, "insert into languages (name) values ('English'), ('Spanish'), ('French')")
	if err != nil {
		t.Fatalf("failed to seed languages table: %v", err)
	}

	h := getHandler(tx)

	rr := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/api/languages", nil)
	if err != nil {
		t.Fatal(err)
	}
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("h returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var res handler.Response[languagesvc.Language]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) != 3 {
		t.Fatalf("data not match")
	}
}
