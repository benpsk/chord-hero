package releaseyear_test

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/releaseyear"
	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
	"github.com/lyricapp/lyric/web/internal/storage"
	releaseyearrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/releaseyear"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(conn storage.Querier) releaseyear.Handler {
	repo := releaseyearrepo.NewRepository(conn)
	svc := releaseyearsvc.NewService(repo)
	return releaseyear.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, albumID, songID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into albums (name, release_year) values ('test album', 2020) returning id").Scan(&albumID)
	if err != nil {
		t.Fatalf("failed to insert albums: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, release_year, created_by, language_id) values ('test song 1', 2021, $1, $2) returning id", userID, langID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs : %v", err)
	}
	_, err = tx.Exec(ctx, "insert into album_song (album_id, song_id) values ($1, $2)", albumID, songID)
	if err != nil {
		t.Fatalf("failed to insert album_song : %v", err)
	}

	req, err := http.NewRequest("GET", "/api/release-year", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	log.Println(rr.Body)

	var res handler.PageResponse[releaseyearsvc.Year]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}
	if res.Total != 1 {
		t.Fatalf("total is not match")
	}
	if len(res.Data) != 1 {
		t.Fatalf("data length not match")
	}
}

func TestHandler_List_Validation(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	testCases := []struct {
		name        string
		queryParams string
		expectedKey string
	}{
		{
			name:        "invalid page",
			queryParams: "page=abc",
			expectedKey: "page",
		},
		{
			name:        "zero page",
			queryParams: "page=0",
			expectedKey: "page",
		},
		{
			name:        "negative page",
			queryParams: "page=-1",
			expectedKey: "page",
		},
		{
			name:        "invalid per_page",
			queryParams: "per_page=abc",
			expectedKey: "per_page",
		},
		{
			name:        "zero per_page",
			queryParams: "per_page=0",
			expectedKey: "per_page",
		},
		{
			name:        "negative per_page",
			queryParams: "per_page=-1",
			expectedKey: "per_page",
		},
	}

	h := getHandler(tx)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/release-year?"+tc.queryParams, nil)
			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()
			h.List(rr, req)

			if status := rr.Code; status != http.StatusUnprocessableEntity {
				t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusUnprocessableEntity)
			}

			var res handler.ErrorResponse[map[string]string]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}

			if _, ok := res.Errors[tc.expectedKey]; !ok {
				t.Errorf("expected error key %s not found", tc.expectedKey)
			}
		})
	}
}
