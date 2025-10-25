package languages_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/languages"
	languagesvc "github.com/lyricapp/lyric/web/internal/services/languages"
	languagerepo "github.com/lyricapp/lyric/web/internal/storage/postgres/languages"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func TestHandler_List(t *testing.T) {
	db := testutil.SetupDB(t)
	defer db.Close()

	// Clean up before test
	_, err := db.Exec(context.Background(), "DELETE FROM languages")
	if err != nil {
		t.Fatalf("failed to clean up languages table: %v", err)
	}

	// Seed data
	_, err = db.Exec(context.Background(), "INSERT INTO languages (name) VALUES ('English'), ('Spanish'), ('French')")
	if err != nil {
		t.Fatalf("failed to seed languages table: %v", err)
	}

	// Get the IDs of the inserted languages
	rows, err := db.Query(context.Background(), "SELECT id, name FROM languages ORDER BY name ASC")
	if err != nil {
		t.Fatalf("failed to query languages table: %v", err)
	}
	defer rows.Close()

	var languagesData []languagesvc.Language
	for rows.Next() {
		var language languagesvc.Language
		err := rows.Scan(&language.ID, &language.Name)
		if err != nil {
			t.Fatalf("failed to scan language row: %v", err)
		}
		languagesData = append(languagesData, language)
	}

	// Create a new request to the /api/languages endpoint.
	req, err := http.NewRequest("GET", "/api/languages", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a new ResponseRecorder to record the response.
	rr := httptest.NewRecorder()

	// Create a new repository and service.
	repo := languagerepo.NewRepository(db)
	svc := languagesvc.NewService(repo)

	// Create a new handler and serve the request.
	handler := languages.New(svc)
	handler.List(rr, req)

	// Check that the status code is http.StatusOK.
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	// Check that the response body is what we expect.
	var respBody map[string][]languagesvc.Language
	err = json.Unmarshal(rr.Body.Bytes(), &respBody)
	if err != nil {
		t.Fatalf("failed to unmarshal response body: %v", err)
	}

	if !reflect.DeepEqual(respBody["data"], languagesData) {
		t.Errorf("handler returned unexpected body: got %v want %v",
			respBody["data"], languagesData)
	}
}

type mockService struct{}

func (m *mockService) List(ctx context.Context) ([]languagesvc.Language, error) {
	return nil, fmt.Errorf("some error")
}

func TestHandler_List_Error(t *testing.T) {
	// Create a new request to the /api/languages endpoint.
	req, err := http.NewRequest("GET", "/api/languages", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	svc := &mockService{}
	handler := languages.New(svc)
	handler.List(rr, req)

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusInternalServerError)
	}
	var respBody map[string]map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &respBody)
	if err != nil {
		t.Fatalf("failed to unmarshal response body: %v", err)
	}
	if _, ok := respBody["errors"]["message"]; !ok {
		t.Errorf("handler returned unexpected body: got %v",
			respBody["errors"])
	}
}
