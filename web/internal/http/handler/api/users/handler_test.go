package users_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/users"
	usersvc "github.com/lyricapp/lyric/web/internal/services/users"
	"github.com/lyricapp/lyric/web/internal/storage"
	userrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/users"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(conn storage.Querier) users.Handler {
	repo := userrepo.NewRepository(conn)
	svc := usersvc.NewService(repo)
	return users.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	_, err := tx.Exec(ctx, `insert into users (email, role) values 
			('test@user.com', 'user'), ('tt@user.com', 'user'), ('jeff@user.com', 'user'),
		('jaff@user.com', 'user'), ('abc@user.com', 'user')`)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}

	testCases := []struct {
		name        string
		queryParams string
		count       int
	}{
		{
			name:        "abc user count",
			queryParams: "email=abc",
			count:       1,
		},
		{
			name:        "j user count",
			queryParams: "email=j",
			count:       2,
		},
		{
			name:        "t user count",
			queryParams: "email=t",
			count:       2,
		},
		{
			name:        "ff user count",
			queryParams: "email=ff",
			count:       2,
		},
	}
	h := getHandler(tx)
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/users?"+tc.queryParams, nil)
			if err != nil {
				t.Fatal(err)
			}
			rr := httptest.NewRecorder()
			h.Search(rr, req)

			if status := rr.Code; status != http.StatusOK {
				t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}
			var res handler.Response[usersvc.User]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("failed to decode or response format is wrong: %v", err)
			}
			if len(res.Data) != tc.count { // Check if length matches expected count
				t.Errorf("data array has wrong length: got %d want %d", len(res.Data), tc.count)
			}
		})
	}
}
