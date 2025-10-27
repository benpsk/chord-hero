package artists_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/artists"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
	"github.com/lyricapp/lyric/web/internal/storage"
	artistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/artists"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(storage storage.Querier) artists.Handler {
	repo := artistrepo.NewRepository(storage)
	svc := artistsvc.NewService(repo)
	return artists.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var artistID int
	err := tx.QueryRow(ctx, "insert into artists (name) values ('test artist') returning id").Scan(&artistID)
	if err != nil {
		t.Fatalf("failed to insert artists: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/artists", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.PageResponse[artistsvc.Artist]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}

	if len(res.Data) == 0 {
		t.Fatalf("data array is empty")
	}
}

func TestHandler_List_Pagination(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	for i := range 5 {
		_, err := tx.Exec(ctx, "insert into artists (name) values ($1)", fmt.Sprintf("artist %d", i))
		if err != nil {
			t.Fatalf("Failed to insert user: %v", err)
		}
	}

	req, err := http.NewRequest("GET", "/api/artists?page=2&per_page=2", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.PageResponse[artistsvc.Artist]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) != 2 {
		t.Errorf("unexpected number of items: got %d want %d", len(res.Data), 2)
	}
}

func TestHandler_List_Search(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	_, err := tx.Exec(ctx, "insert into artists (name) values ('test artist')")
	if err != nil {
		t.Fatalf("Failed to artists : %v", err)
	}
	_, err = tx.Exec(ctx, "insert into artists (name) values ('another artist')")
	if err != nil {
		t.Fatalf("Failed to artists2 : %v", err)
	}

	req, err := http.NewRequest("GET", "/api/artists?search=test", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	var res handler.PageResponse[artistsvc.Artist]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}

	if len(res.Data) != 1 {
		t.Errorf("unexpected number of items: got %d want %d", len(res.Data), 1)
	}
	item := res.Data[0]
	if item.Name != "test artist" {
		t.Errorf("unexpected artist name: got %s want %s", item.Name, "test artist")
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
			req, err := http.NewRequest("GET", "/api/artists?"+tc.queryParams, nil)
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
