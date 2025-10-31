package login_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/lyricapp/lyric/web/internal/config"
	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/login"
	loginsvc "github.com/lyricapp/lyric/web/internal/services/login"
	"github.com/lyricapp/lyric/web/internal/storage"
	loginrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/login"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(conn storage.Querier) login.Handler {
	repo := loginrepo.NewRepository(conn)
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	loginMailer := loginsvc.NewConsoleMailer(cfg.Auth.SMTP.From)
	svc := loginsvc.NewService(
		repo,
		loginMailer,
		loginsvc.Config{
			CodeLength:  cfg.Auth.OTPLength,
			TTL:         cfg.Auth.OTPTTL,
			TokenSecret: cfg.Auth.TokenSecret,
			TokenTTL:    cfg.Auth.TokenTTL,
		},
	)
	handler := login.New(svc)
	return handler
}

func TestHandler_Request(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "insert into users (email, status) values ('exisint@mail.com', 'active')"); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}

	testCases := []struct {
		name               string
		expectedStatusCode int
		input              map[string]string
	}{
		{
			name:               "new user",
			expectedStatusCode: http.StatusOK,
			input:              map[string]string{"username": "abc@mail.com"},
		},
		{
			name:               "existing user",
			expectedStatusCode: http.StatusOK,
			input:              map[string]string{"username": "existing@mail.com"},
		},
	}

	h := getHandler(tx)
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			requestBody, _ := json.Marshal(tc.input)
			req, err := http.NewRequest("POST", "/api/login", bytes.NewBuffer(requestBody))
			if err != nil {
				t.Fatal(err)
			}
			rr := httptest.NewRecorder()

			h.Request(rr, req)
			if status := rr.Code; status != http.StatusOK {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, http.StatusOK)
			}
			var res handler.ResponseMessage[map[string]string]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}
			if v, ok := res.Data["message"]; !ok {
				t.Errorf("handler returned unexpected body: %s not found", v)
			}

			var email string
			tx.QueryRow(ctx, "select email from users where email=$1 limit 1", tc.input["username"]).Scan(&email)
			if email != tc.input["username"] {
				t.Errorf("insert data not match")
			}
			var count int
			tx.QueryRow(ctx, "select count(*) from user_login_codes").Scan(&count)
			if count == 0 {
				t.Errorf("insert login code not match")
			}
		})
	}
}

func TestHandler_Request_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	h := getHandler(tx)

	testCases := []struct {
		name               string
		expectedStatusCode int
		input              map[string]string
		expectedErrorKeys  []string
	}{
		{
			name:               "empty username",
			expectedStatusCode: http.StatusUnprocessableEntity,
			input:              map[string]string{"username": ""},
			expectedErrorKeys:  []string{"username"},
		},
		{
			name:               "invalid email",
			expectedStatusCode: http.StatusUnprocessableEntity,
			input:              map[string]string{"username": "abc"},
			expectedErrorKeys:  []string{"username"},
		},
		{
			name:               "invalid request body",
			expectedStatusCode: http.StatusBadRequest,
			input:              map[string]string{"": ""},
			expectedErrorKeys:  []string{"message"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(tc.input)
			req, err := http.NewRequest("POST", "/api/login", bytes.NewBuffer(body))
			if err != nil {
				t.Fatal(err)
			}
			rr := httptest.NewRecorder()
			h.Request(rr, req)
			if status := rr.Code; status != tc.expectedStatusCode {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, http.StatusOK)
			}

			var res handler.ErrorResponse[map[string]string]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}

			for _, key := range tc.expectedErrorKeys {
				if v, ok := res.Errors[key]; !ok {
					t.Errorf("handler returned unexpected body: %s not found", v)
				}
			}
		})
	}
}

func TestHandler_Request_InactiveUser(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	username := "inactive@mail.com"
	if _, err := tx.Exec(ctx, "insert into users (email, role, status) values ($1, 'musician', 'deleted')", username); err != nil {
		t.Fatalf("failed to seed inactive user: %v", err)
	}

	var email string
	var id int
	var status string
	err := tx.QueryRow(ctx, "select id, email, status from users limit 1").Scan(&id, &email, &status)
	if err != nil {
		t.Fatalf("failed to seed inactive user: %v", err)
	}
	log.Println(id, email, status)
	body, _ := json.Marshal(map[string]string{"username": username})
	req, err := http.NewRequest("POST", "/api/login", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.Request(rr, req)
	log.Println(rr.Body.String())

	if status := rr.Code; status != http.StatusForbidden {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusForbidden)
	}

	var res handler.ErrorResponse[map[string]string]
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if msg, ok := res.Errors["message"]; !ok || msg == "" {
		t.Errorf("expected error message for inactive user, got %v", res.Errors)
	}

	var count int
	if err := tx.QueryRow(ctx, "select count(*) from user_login_codes").Scan(&count); err != nil {
		t.Fatalf("failed counting login codes: %v", err)
	}
	if count != 0 {
		t.Errorf("expected no login code for inactive user, got %d", count)
	}
}

func TestHandler_Verify(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	input := struct {
		userId    int
		username  string
		code      string
		expiresAt time.Time
	}{
		userId:    0,
		username:  "abc@mail.com",
		code:      "123456",
		expiresAt: time.Now().Add(time.Minute * 5),
	}

	tx.QueryRow(ctx, "insert into users (email, role, status) values($1, $2, 'active') returning id", input.username, "musician").Scan(&input.userId)
	if input.userId == 0 {
		t.Errorf("insert user :%v", input.userId)
	}
	_, err := tx.Exec(ctx, "insert into user_login_codes (user_id, code, expires_at) values($1, $2, $3)", input.userId, input.code, input.expiresAt)
	if err != nil {
		t.Errorf("insert code :%v", err)
	}
	requestBody, _ := json.Marshal(map[string]string{"code": input.code})
	req, _ := http.NewRequest("POST", "/api/code", bytes.NewBuffer(requestBody))

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.Verify(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	var res handler.ResponseMessage[map[string]string]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}

	if v, ok := res.Data["access_token"]; !ok {
		t.Errorf("handler returned unexpected body: %s not found", v)
	}

	type actualType struct {
		code    string
		used_at *time.Time
	}
	var actual actualType
	tx.QueryRow(ctx, "select code, used_at from user_login_codes limit 1").Scan(&actual.code, &actual.used_at)
	if actual.code != input.code {
		t.Errorf("insert code not match")
	}
	if actual.used_at == nil {
		t.Errorf("used at should not be nil")
	}
}

func TestHandler_Verify_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	input := struct {
		userId    int
		username  string
		code      string
		expiresAt time.Time
	}{
		userId:    0,
		username:  "abc@mail.com",
		code:      "123456",
		expiresAt: time.Now(),
	}
	tx.QueryRow(ctx, "insert into users (email, role, status) values($1, $2, 'active') returning id", input.username, "musician").Scan(&input.userId)
	if input.userId == 0 {
		t.Errorf("insert user :%v", input.userId)
	}
	_, err := tx.Exec(ctx, "insert into user_login_codes (user_id, code, expires_at) values($1, $2, $3)", input.userId, input.code, input.expiresAt)
	if err != nil {
		t.Errorf("insert code :%v", err)
	}
	testCases := []struct {
		name           string
		input          map[string]string
		expectedStatus int
		errorKeys      []string
	}{
		{
			name:           "empty login code",
			input:          map[string]string{"code": ""},
			expectedStatus: http.StatusUnprocessableEntity,
			errorKeys:      []string{"code"},
		},
		{
			name:           "incorrect login code",
			input:          map[string]string{"code": "291911"},
			expectedStatus: http.StatusUnprocessableEntity,
			errorKeys:      []string{"code"},
		},
		{
			name:           "expires login code",
			input:          map[string]string{"code": input.code},
			expectedStatus: http.StatusUnprocessableEntity,
			errorKeys:      []string{"code"},
		},
	}
	h := getHandler(tx)
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			requestBody, _ := json.Marshal(tc.input)
			req, _ := http.NewRequest("POST", "/api/code", bytes.NewBuffer(requestBody))
			rr := httptest.NewRecorder()
			h.Verify(rr, req)

			if status := rr.Code; status != tc.expectedStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tc.expectedStatus)
			}
			var res handler.ErrorResponse[map[string]string]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}
			if v, ok := res.Errors["code"]; !ok {
				t.Errorf("handler returned unexpected body: %s not found", v)
			}

			var used_at *time.Time
			tx.QueryRow(ctx, "select used_at from user_login_codes limit 1").Scan(&used_at)
			if used_at != nil {
				t.Errorf("used at should not be nil")
			}
		})
	}
}

func TestHandler_Verify_InactiveUser(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	input := struct {
		userID    int
		username  string
		code      string
		expiresAt time.Time
	}{
		username:  "suspended@mail.com",
		code:      "222333",
		expiresAt: time.Now().Add(5 * time.Minute),
	}

	if err := tx.QueryRow(ctx, "insert into users (email, role, status) values ($1, 'musician', 'deleted') returning id", input.username).Scan(&input.userID); err != nil {
		t.Fatalf("failed to seed inactive user: %v", err)
	}
	if _, err := tx.Exec(ctx, "insert into user_login_codes (user_id, code, expires_at) values ($1, $2, $3)", input.userID, input.code, input.expiresAt); err != nil {
		t.Fatalf("failed to seed login code: %v", err)
	}

	body, _ := json.Marshal(map[string]string{"code": input.code})
	req, _ := http.NewRequest("POST", "/api/code", bytes.NewBuffer(body))

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.Verify(rr, req)

	if status := rr.Code; status != http.StatusForbidden {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusForbidden)
	}

	var res handler.ErrorResponse[map[string]string]
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if msg, ok := res.Errors["message"]; !ok || msg == "" {
		t.Errorf("expected error message for inactive user, got %v", res.Errors)
	}

	var usedAt *time.Time
	if err := tx.QueryRow(ctx, "select used_at from user_login_codes where user_id = $1", input.userID).Scan(&usedAt); err != nil {
		t.Fatalf("failed to fetch login code usage: %v", err)
	}
	if usedAt != nil {
		t.Errorf("expected login code to remain unused, got %v", usedAt)
	}
}

func TestHandler_Me(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	username := "test@test.com"
	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role, status) values ($1, 'musician', 'active') returning id", username).Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	h := getHandler(tx)
	rr := httptest.NewRecorder()

	r, accessToken := testutil.AuthToken(t, userID)
	r.Post("/api/me", h.Me)

	req, _ := http.NewRequest("POST", "/api/me", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	var res handler.ResponseMessage[map[string]string]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}
	v, ok := res.Data["username"]
	if !ok {
		t.Errorf("handler returned unexpected body: %s not found", v)
	}
	if v != username {
		t.Errorf("username not match: %s", v)
	}
}

func TestHandler_Me_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	username := "test@test.com"
	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role, status) values ($1, 'musician', 'active') returning id", username).Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	h := getHandler(tx)
	rr := httptest.NewRecorder()

	r, _ := testutil.AuthToken(t, userID)
	r.Post("/api/me", h.Me)

	req, _ := http.NewRequest("POST", "/api/me", nil)
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	var res handler.ErrorResponse[map[string]string]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}

	v, ok := res.Errors["message"]
	if !ok {
		t.Errorf("handler returned unexpected body: %s not found", v)
	}
}

func TestHandler_Delete_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	if err := tx.QueryRow(ctx, "insert into users (email, role, status) values ('delete@test.com', 'musician', 'active') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	h := getHandler(tx)
	r, accessToken := testutil.AuthToken(t, userID)
	r.Delete("/api/user", h.Delete)

	req, err := http.NewRequest("DELETE", "/api/user", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	var response handler.ResponseMessage[map[string]string]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if response.Data["message"] != "Account deleted successfully" {
		t.Fatalf("unexpected response message: %s", response.Data["message"])
	}

	var status string
	if err := tx.QueryRow(ctx, "select status from users where id = $1", userID).Scan(&status); err != nil {
		t.Fatalf("failed to fetch user: %v", err)
	}
	if status != "deleted" {
		t.Fatalf("expected user status to be deleted, got %s", status)
	}
}

func TestHandler_Delete_Unauthorized(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID int
	if err := tx.QueryRow(ctx, "insert into users (email, role, status) values ('unauth-delete@test.com', 'musician', 'active') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	h := getHandler(tx)
	r, _ := testutil.AuthToken(t, userID)
	r.Delete("/api/user", h.Delete)

	req, err := http.NewRequest("DELETE", "/api/user", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusUnauthorized)
	}
}
