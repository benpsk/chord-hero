package playlists_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/playlists"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
	playlistrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/playlists"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func TestHandler_Create_Success(t *testing.T) {
	db := testutil.SetupDB(t)
	defer db.Close()

	// Clean up before test
	_, err := db.Exec(context.Background(), "DELETE FROM playlists")
	if err != nil {
		t.Fatalf("failed to clean up playlists table: %v", err)
	}
	_, err = db.Exec(context.Background(), "DELETE FROM users")
	if err != nil {
		t.Fatalf("failed to clean up users table: %v", err)
	}

	// Seed user
	var userID int
	err = db.QueryRow(context.Background(), "INSERT INTO users (email, role) VALUES ('test@test.com', 'user') RETURNING id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, db, userID)
	// Create a new repository and service.
	repo := playlistrepo.NewRepository(db)
	svc := playlistsvc.NewService(repo)
	handler := playlists.New(svc)

	// 2. Mount your REAL handler
	r.Post("/api/playlists", handler.Create)
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

	// Check that the response body is what we expect.
	var respBody map[string]map[string]interface{}
	err = json.NewDecoder(rr.Body).Decode(&respBody)
	if err != nil {
		t.Fatalf("failed to unmarshal response body: %v", err)
	}
	if _, ok := respBody["data"]["playlist_id"]; !ok {
		t.Errorf("handler returned unexpected body: playlist_id not found")
	}
}

func TestHandler_Create_Fail(t *testing.T) {
	db := testutil.SetupDB(t)
	defer db.Close()

	// Clean up before test
	_, err := db.Exec(context.Background(), "DELETE FROM playlists")
	if err != nil {
		t.Fatalf("failed to clean up playlists table: %v", err)
	}
	_, err = db.Exec(context.Background(), "DELETE FROM users")
	if err != nil {
		t.Fatalf("failed to clean up users table: %v", err)
	}

	// Seed user
	var userID int
	err = db.QueryRow(context.Background(), "INSERT INTO users (email, role) VALUES ('test@test.com', 'user') RETURNING id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, db, userID)

	// Create a new repository and service.
	repo := playlistrepo.NewRepository(db)
	svc := playlistsvc.NewService(repo)
	handler := playlists.New(svc)

	// 2. Mount your REAL handler
	r.Post("/api/playlists", handler.Create)

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

			var respBody map[string]map[string]string
			err = json.Unmarshal(rr.Body.Bytes(), &respBody)
			if err != nil {
				t.Fatalf("failed to unmarshal response body: %v", err)
			}
			if _, ok := respBody["errors"][tc.expectedErrorKey]; !ok {
				t.Errorf("handler returned unexpected body: error key %s not found", tc.expectedErrorKey)
			}
		})
	}
}
