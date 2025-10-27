package writers_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/writers"
	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
	"github.com/lyricapp/lyric/web/internal/storage"
	writerrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/writers"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(conn storage.Querier) writers.Handler {
	repo := writerrepo.NewRepository(conn)
	svc := writersvc.NewService(repo)
	return writers.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var writerID int
	err := tx.QueryRow(ctx, "insert into writers (name) values ('test writer') returning id").Scan(&writerID)
	if err != nil {
		t.Fatalf("failed to insert writers: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/writers", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.PageResponse[writersvc.Writer]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if res.Total == 0 {
		t.Fatalf("total count not match")
	}
	if len(res.Data) == 0 {
		t.Fatalf("data length not match")
	}
}

func TestHandler_List_Pagination(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	for i := range 5 {
		_, err := tx.Exec(ctx, "insert into writers (name) values ($1)", fmt.Sprintf("writer %d", i))
		if err != nil {
			t.Fatalf("failed to insert writers: %v", err)
		}
	}

	req, err := http.NewRequest("GET", "/api/writers?page=2&per_page=2", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	var res handler.PageResponse[writersvc.Writer]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}

	if res.Page != 2 {
		t.Errorf("unexpected page value: got %v want %v", res.Page, 2)
	}
	if res.PerPage != 2 {
		t.Errorf("unexpected per_page value: got %v want %v", res.PerPage, 2)
	}
	if len(res.Data) != 2 {
		t.Errorf("unexpected number of items: got %d want %d", len(res.Data), 2)
	}
	if res.Total != 5 {
		t.Errorf("unexpected number of items: got %d want %d", res.Total, 5)
	}
}

func TestHandler_List_Search(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	_, err := tx.Exec(ctx, "insert into writers (name) values ('test writer'), ('another writer')")
	if err != nil {
		t.Fatalf("failed to insert writers: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/writers?search=test", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	var res handler.PageResponse[writersvc.Writer]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	if len(res.Data) != 1 {
		t.Errorf("unexpected number of items: got %d want %d", len(res.Data), 1)
	}
	if res.Data[0].Name != "test writer" {
		t.Errorf("unexpected writer name: got %s want %s", res.Data[0].Name, "test writer")
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
			req, err := http.NewRequest("GET", "/api/writers?"+tc.queryParams, nil)
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
				t.Fatalf("failed to decode or response format is wrong: %v", err)
			}

			if _, ok := res.Errors[tc.expectedKey]; !ok {
				t.Errorf("expected error key %s not found", tc.expectedKey)
			}
		})
	}
}
