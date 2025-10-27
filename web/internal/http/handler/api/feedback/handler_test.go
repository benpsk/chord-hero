package feedback_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/feedback"
	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
	"github.com/lyricapp/lyric/web/internal/storage"
	feedbackrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/feedback"
	"github.com/lyricapp/lyric/web/internal/testutil"
)


func getHandler(storage storage.Querier) feedback.Handler {
	repo := feedbackrepo.NewRepository(storage)
	svc := feedbacksvc.NewService(repo)
	return feedback.New(svc)
}

func TestHandler_Create_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users table: %v", err)
	}

	h := getHandler(tx)
	r, accessToken := testutil.AuthToken(t, tx, userID)
	r.Post("/api/feedback", h.Create)

	requestBody, _ := json.Marshal(map[string]string{"message": "My Playlist"})
	req, err := http.NewRequest("POST", "/api/feedback", bytes.NewBuffer(requestBody))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var count int
	tx.QueryRow(ctx, "select count(*) from feedbacks where user_id = $1", userID).Scan(&count)
	if count != 1 {
		t.Errorf("feedback was not created")
	}
}

func TestHandler_Create_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	h := getHandler(tx)
	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("Failed to insert users: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, tx, userID)
	r.Post("/api/feedback", h.Create)

	testCases := []struct {
		name               string
		message            string
		authorized         bool
		expectedStatusCode int
		expectedErrorKey   string
	}{
		{"empty message", "", true, http.StatusUnprocessableEntity, "message"},
		{"message too long", strings.Repeat("a", 226), true, http.StatusUnprocessableEntity, "message"},
		{"unauthorized", "This is a test feedback", false, http.StatusUnauthorized, ""},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			payload := map[string]string{"message": tc.message}
			var buf bytes.Buffer
			err := json.NewEncoder(&buf).Encode(payload)
			if err != nil {
				t.Fatal(err)
			}

			req, err := http.NewRequest("POST", "/api/feedback", &buf)
			if err != nil {
				t.Fatal(err)
			}

			if tc.authorized {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
			}

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if status := rr.Code; status != tc.expectedStatusCode {
				t.Errorf("handler returned wrong status code: got %v want %v", status, tc.expectedStatusCode)
			}

			if tc.expectedErrorKey != "" {
				var res handler.ErrorResponse[map[string]string]
				decoder := json.NewDecoder(rr.Body)
				decoder.DisallowUnknownFields()
				err = decoder.Decode(&res)
				if err != nil {
					t.Fatalf("Failed to decode or response format is wrong: %v", err)
				}
				if _, ok := res.Errors[tc.expectedErrorKey]; !ok {
					t.Errorf("expected error key %s not found", tc.expectedErrorKey)
				}
			}
		})
	}
}
