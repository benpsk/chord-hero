package trending_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/trending"
	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
	"github.com/lyricapp/lyric/web/internal/storage"
	trendingrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/trending"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(conn storage.Querier) trending.Handler {
	repo := trendingrepo.NewRepository(conn)
	svc := trendingsvc.NewService(repo)
	return trending.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var levelID int
	err := tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into trending_songs (name, level_id, description) values ('Top 50', $1, 'test description')", levelID)
	if err != nil {
		t.Fatalf("failed to insert trending_songs: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/trending-songs", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
	var res handler.Response[trendingsvc.Trending]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) != 1 {
		t.Fatalf("data length not match")
	}
}

func TestHandler_Albums(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, artistID, albumID, songID, languageID int
	err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into users (email, role) values ('test@test.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into artists (name) values ('test artist') returning id").Scan(&artistID)
	if err != nil {
		t.Fatalf("failed to insert artists: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into albums (name) values ('test album') returning id").Scan(&albumID)
	if err != nil {
		t.Fatalf("failed to insert albums: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('test song', $1, $2) returning id", userID, languageID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into album_song (album_id, song_id) values ($1, $2)", albumID, songID)
	if err != nil {
		t.Fatalf("failed to insert album_song: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into album_artist (album_id, artist_id) values ($1, $2)", albumID, artistID)
	if err != nil {
		t.Fatalf("failed to insert album_artist: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into plays (song_id, user_id, created_at) values ($1, $2, now())", songID, userID)
	if err != nil {
		t.Fatalf("failed to insert plays: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/trending-albums", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.Albums(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.Response[trendingsvc.TrendingAlbum]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) != 1 {
		t.Fatalf("data length not match")
	}
}

func TestHandler_Artists(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, artistID, songID, languageID int
	err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into users (email, role) values ('test@test.com', 'user') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into artists (name) values ('test artist') returning id").Scan(&artistID)
	if err != nil {
		t.Fatalf("failed to insert artists: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('test song', $1, $2) returning id", userID, languageID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into artist_song (artist_id, song_id) values ($1, $2)", artistID, songID)
	if err != nil {
		t.Fatalf("failed to insert artist_song: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into plays (song_id, user_id, created_at) values ($1, $2, now())", songID, userID)
	if err != nil {
		t.Fatalf("failed to insert plays: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/trending-artists", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.Artists(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.Response[trendingsvc.TrendingArtist]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}
	if len(res.Data) == 0 {
		t.Fatalf("data length not match")
	}
}

