package levels_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/levels"
	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
	levelrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/levels"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func TestHandler_List(t *testing.T) {
	db := testutil.SetupDB(t)
	defer db.Close()

	// Clean up before test
	_, err := db.Exec(context.Background(), "DELETE FROM levels")
	if err != nil {
		t.Fatalf("failed to clean up levels table: %v", err)
	}

	// Seed data
	_, err = db.Exec(context.Background(), "INSERT INTO levels (name) VALUES ('Easy'), ('Medium'), ('Hard')")
	if err != nil {
		t.Fatalf("failed to seed levels table: %v", err)
	}

	// Get the IDs of the inserted levels
	rows, err := db.Query(context.Background(), "SELECT id, name FROM levels ORDER BY name ASC")
	if err != nil {
		t.Fatalf("failed to query levels table: %v", err)
	}
	defer rows.Close()

	var levelsData []levelsvc.Level
	for rows.Next() {
		var level levelsvc.Level
		err := rows.Scan(&level.ID, &level.Name)
		if err != nil {
			t.Fatalf("failed to scan level row: %v", err)
		}
		levelsData = append(levelsData, level)
	}

	// Create a new request to the /api/levels endpoint.
	req, err := http.NewRequest("GET", "/api/levels", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a new ResponseRecorder to record the response.
	rr := httptest.NewRecorder()

	// Create a new repository and service.
	repo := levelrepo.NewRepository(db)
	svc := levelsvc.NewService(repo)

	// Create a new handler and serve the request.
	handler := levels.New(svc)
	handler.List(rr, req)

	// Check that the status code is http.StatusOK.
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	// Check that the response body is what we expect.
	var respBody map[string][]levelsvc.Level
	err = json.Unmarshal(rr.Body.Bytes(), &respBody)
	if err != nil {
		t.Fatalf("failed to unmarshal response body: %v", err)
	}

	if !reflect.DeepEqual(respBody["data"], levelsData) {
		t.Errorf("handler returned unexpected body: got %v want %v",
			respBody["data"], levelsData)
	}

	// Clean up after test
	_, err = db.Exec(context.Background(), "DELETE FROM levels")
	if err != nil {
		t.Fatalf("failed to clean up levels table: %v", err)
	}
}
