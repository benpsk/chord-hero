package albums_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/albums"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	"github.com/lyricapp/lyric/web/internal/storage"
	albumrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/albums"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(storage storage.Querier) albums.Handler {
	repo := albumrepo.NewRepository(storage)
	svc := albumsvc.NewService(repo)
	return albums.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var albumID int
	tx.QueryRow(ctx, "insert into albums (name, release_year) values ('test album', 2022) returning id").Scan(&albumID)

	h := getHandler(tx)
	rr := httptest.NewRecorder()

	req, err := http.NewRequest("GET", "/api/albums", nil)
	if err != nil {
		t.Fatal(err)
	}
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var resp handler.PageResponse[albumsvc.Album]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&resp)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}
	if len(resp.Data) != 1 {
		t.Fatalf("data array not match")
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
			name:        "invalid per_page",
			queryParams: "per_page=abc",
			expectedKey: "per_page",
		},
		{
			name:        "invalid playlist_id",
			queryParams: "playlist_id=abc",
			expectedKey: "playlist_id",
		},
		{
			name:        "invalid user_id",
			queryParams: "user_id=abc",
			expectedKey: "user_id",
		},
	}

	h := getHandler(tx)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/albums?"+tc.queryParams, nil)
			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()
			h.List(rr, req)

			if status := rr.Code; status != http.StatusUnprocessableEntity {
				t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusUnprocessableEntity)
			}
			var resp handler.ErrorResponse[map[string]string]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&resp)
			if err != nil {
				t.Fatalf("failed to decode or response format is wrong: %v", err)
			}
			if _, ok := resp.Errors[tc.expectedKey]; !ok {
				t.Errorf("expected error key %s not found", tc.expectedKey)
			}
		})
	}
}

func TestHandler_List_Filters(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, playlistID, songID, languageID int

	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('test playlist', $1) returning id", userID).Scan(&playlistID)
	if err != nil {
		t.Fatalf("Failed to insert playlist: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('burmese') returning id").Scan(&languageID)
	if err != nil {
		t.Fatalf("Failed to insert languges: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('test song', $1, $2) returning id", userID, languageID).Scan(&songID)
	if err != nil {
		t.Fatalf("Failed to insert song: %v", err)
	}
	if _, err := tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2)", playlistID, songID); err != nil {
		t.Fatalf("Failed to insert playlist_song: %v", err)
	}

	var albumID1, albumID2 int
	err = tx.QueryRow(ctx, "insert into albums (name, release_year) values ('album 1', 2022) returning id").Scan(&albumID1)
	if err != nil {
		t.Fatalf("Failed to insert album1: %v", err)
	}

	err = tx.QueryRow(ctx, "insert into albums (name, release_year) values ('album 2', 2023) returning id").Scan(&albumID2)
	if err != nil {
		t.Fatalf("Failed to insert album2: %v", err)
	}

	if _, err := tx.Exec(ctx, "insert into album_song (album_id, song_id) values ($1, $2)", albumID1, songID); err != nil {
		t.Fatalf("Failed to insert album_song: %v", err)
	}

	testCases := []struct {
		name          string
		queryParams   string
		expectedCount int
	}{
		{
			name:          "filter by search",
			queryParams:   "search=album 1",
			expectedCount: 1,
		},
	}
	h := getHandler(tx)
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/albums?"+tc.queryParams, nil)
			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()
			h.List(rr, req)

			if status := rr.Code; status != http.StatusOK {
				t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			var resp handler.PageResponse[any]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&resp)
			if err != nil {
				t.Fatalf("failed to decode or response format is wrong: %v", err)
			}
			if len(resp.Data) != tc.expectedCount {
				t.Errorf("unexpected number of items: got %d want %d", len(resp.Data), tc.expectedCount)
			}
		})
	}
}
