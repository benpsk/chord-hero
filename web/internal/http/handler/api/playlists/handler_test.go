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

func TestHandler_Create_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@test.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, tx, userID)
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
	err := tx.QueryRow(ctx, "INSERT INTO users (email, role) VALUES ('test@test.com', 'user') RETURNING id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, tx, userID)
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
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@test.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, tx, userID)

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
