package login_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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

	username := "abc@mail.com"
	requestBody, _ := json.Marshal(map[string]string{"username": username})
	req, err := http.NewRequest("GET", "/api/login", bytes.NewBuffer(requestBody))
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
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
	tx.QueryRow(ctx, "select email from users where email=$1 limit 1", username).Scan(&email)
	if email != username {
		t.Errorf("insert data not match")
	}
	var count int
	tx.QueryRow(ctx, "select count(*) from user_login_codes").Scan(&count)
	if count == 0 {
		t.Errorf("insert login code not match")
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

	tx.QueryRow(ctx, "insert into users (email, role) values($1, $2) returning id", input.username, "user").Scan(&input.userId)
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
	tx.QueryRow(ctx, "insert into users (email, role) values($1, $2) returning id", input.username, "user").Scan(&input.userId)
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

func TestHandler_Me(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	username := "test@test.com"
	var userID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ($1, 'user') returning id", username).Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	h := getHandler(tx)
	rr := httptest.NewRecorder()

	r, accessToken := testutil.AuthToken(t, tx, userID)
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
	err := tx.QueryRow(ctx, "insert into users (email, role) values ($1, 'user') returning id", username).Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	h := getHandler(tx)
	rr := httptest.NewRecorder()

	r, _ := testutil.AuthToken(t, tx, userID)
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
