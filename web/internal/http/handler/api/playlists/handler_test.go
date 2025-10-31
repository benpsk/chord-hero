package playlists_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/playlists"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
	"github.com/lyricapp/lyric/web/internal/storage"
	playlistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/playlists"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(storage storage.Querier) playlists.Handler {
	repo := playlistrepo.NewRepository(storage)
	svc := playlistsvc.NewService(repo)
	return playlists.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('abc@mail.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed users table: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into playlists (name, user_id) values ('my playlist 1', $1), ('my plylist 2', $1)", userID)
	if err != nil {
		t.Fatalf("failed to seed playlists table: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)

	r.Get("/api/playlists", h.List)

	req, err := http.NewRequest("GET", "/api/playlists", nil)
	if err != nil {
		t.Fatal(err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("h returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var res handler.PageResponse[playlistsvc.Playlist]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) != 2 {
		t.Fatalf("data mot match")
	}
	if res.Total != 2 {
		t.Fatalf("total count not match")
	}
}

func TestHandler_Create_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@test.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)

	r.Post("/api/playlists", h.Create)
	requestBody, _ := json.Marshal(map[string]string{"name": "My Playlist"})
	req, err := http.NewRequest("POST", "/api/playlists", bytes.NewBuffer(requestBody))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	// Create a new ResponseRecorder to record the response.
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	// Check that the status code is http.StatusCreated.
	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusCreated)
	}

	var res handler.ResponseMessage[map[string]any]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}
	if _, ok := res.Data["message"]; !ok {
		t.Errorf("handler returned unexpected body: playlist_id not found")
	}
}

func TestHandler_Create_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	err := tx.QueryRow(ctx, "INSERT INTO users (email, role) VALUES ('test@test.com', 'musician') RETURNING id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)

	r.Post("/api/playlists", h.Create)

	testCases := []struct {
		name               string
		requestBody        map[string]string
		expectedStatusCode int
		expectedErrorKey   string
	}{
		{
			name:               "empty name",
			requestBody:        map[string]string{"name": ""},
			expectedStatusCode: http.StatusUnprocessableEntity,
			expectedErrorKey:   "name",
		},
		{
			name:               "name length too long",
			requestBody:        map[string]string{"name": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."},
			expectedStatusCode: http.StatusUnprocessableEntity,
			expectedErrorKey:   "name",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			requestBody, _ := json.Marshal(tc.requestBody)
			req, err := http.NewRequest("POST", "/api/playlists", bytes.NewBuffer(requestBody))
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

			// Create a new ResponseRecorder to record the response.
			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			// Check that the status code is correct.
			if status := rr.Code; status != tc.expectedStatusCode {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tc.expectedStatusCode)
			}

			var res handler.ErrorResponse[map[string]string]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}

			if _, ok := res.Errors[tc.expectedErrorKey]; !ok {
				t.Errorf("handler returned unexpected body: error key %s not found", tc.expectedErrorKey)
			}
		})
	}
}

func TestHandler_List_Validation(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@test.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)

	h := getHandler(tx)
	r.Get("/api/playlists", h.List)

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

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/playlists?"+tc.queryParams, nil)
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

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

func TestHandler_UpdateSongs_AddsSongs(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID     int
		languageID int
		playlistID int
		songIDs    []int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}

	songIDs = make([]int, 3)
	for i := 0; i < 3; i++ {
		if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ($1, $2, $3) returning id", fmt.Sprintf("song-%d", i+1), userID, languageID).Scan(&songIDs[i]); err != nil {
			t.Fatalf("failed to insert song %d: %v", i+1, err)
		}
	}

	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('test playlist', $1) returning id", userID).Scan(&playlistID); err != nil {
		t.Fatalf("failed to insert playlist: %v", err)
	}

	if _, err := tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2), ($1, $3)", playlistID, songIDs[0], songIDs[1]); err != nil {
		t.Fatalf("failed to seed playlist songs: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/playlists/{playlist_id}/songs", h.UpdateSongs)

	payload := map[string]any{
		"song_ids": []int{songIDs[2], songIDs[0]},
		"action":   "add",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	requestPath := fmt.Sprintf("/api/playlists/%d/songs", playlistID)
	req, err := http.NewRequest("POST", requestPath, bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	rows, err := tx.Query(ctx, "select song_id from playlist_song where playlist_id = $1 order by created_at asc", playlistID)
	if err != nil {
		t.Fatalf("failed to query playlist songs: %v", err)
	}
	defer rows.Close()

	var got []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("failed to scan song id: %v", err)
		}
		got = append(got, id)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iteration error: %v", err)
	}

	expected := []int{songIDs[0], songIDs[1], songIDs[2]}
	if len(got) != len(expected) {
		t.Fatalf("unexpected song count: got %d want %d", len(got), len(expected))
	}
	for _, id := range expected {
		found := false
		for _, actual := range got {
			if actual == id {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected song id %d not found in playlist", id)
		}
	}
}

func TestHandler_UpdateSongs_RemovesSongs(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID     int
		languageID int
		playlistID int
		songIDs    []int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('remove@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('french') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}

	songIDs = make([]int, 3)
	for i := 0; i < 3; i++ {
		if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ($1, $2, $3) returning id", fmt.Sprintf("remove-song-%d", i+1), userID, languageID).Scan(&songIDs[i]); err != nil {
			t.Fatalf("failed to insert song %d: %v", i+1, err)
		}
	}

	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('remove playlist', $1) returning id", userID).Scan(&playlistID); err != nil {
		t.Fatalf("failed to insert playlist: %v", err)
	}

	if _, err := tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2), ($1, $3), ($1, $4)", playlistID, songIDs[0], songIDs[1], songIDs[2]); err != nil {
		t.Fatalf("failed to seed playlist songs: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/playlists/{playlist_id}/songs", h.UpdateSongs)

	payload := map[string]any{
		"song_ids": []int{songIDs[1]},
		"action":   "remove",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	requestPath := fmt.Sprintf("/api/playlists/%d/songs", playlistID)
	req, err := http.NewRequest("POST", requestPath, bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	rows, err := tx.Query(ctx, "select song_id from playlist_song where playlist_id = $1 order by song_id asc", playlistID)
	if err != nil {
		t.Fatalf("failed to query playlist songs: %v", err)
	}
	defer rows.Close()

	var got []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("failed to scan song id: %v", err)
		}
		got = append(got, id)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iteration error: %v", err)
	}

	expected := []int{songIDs[0], songIDs[2]}
	if len(got) != len(expected) {
		t.Fatalf("unexpected song count: got %d want %d", len(got), len(expected))
	}
	for _, id := range expected {
		found := false
		for _, actual := range got {
			if actual == id {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected song id %d not found in playlist", id)
		}
	}
}
