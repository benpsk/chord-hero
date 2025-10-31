package songs_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/songs"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
	"github.com/lyricapp/lyric/web/internal/storage"
	songrepo "github.com/lyricapp/lyric/web/internal/storage/postgres/songs"
	"github.com/lyricapp/lyric/web/internal/testutil"
)

func getHandler(conn storage.Querier) songs.Handler {
	repo := songrepo.NewRepository(conn)
	svc := songsvc.NewService(repo)
	return songs.New(svc)
}

func TestHandler_List(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, songID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id, level_id, key, lyric) values ('test song', $1, $2, $3, 'C', 'test lyric') returning id", userID, langID, levelID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}

	req, err := http.NewRequest("GET", "/api/songs", nil)
	if err != nil {
		t.Fatal(err)
	}

	h := getHandler(tx)
	rr := httptest.NewRecorder()
	h.List(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.PageResponse[songsvc.Song]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}

	if res.Total != 1 {
		t.Fatalf("total count not match")
	}
	if len(res.Data) != 1 {
		t.Fatalf("data count not match")
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
			name:        "invalid per_page",
			queryParams: "per_page=abc",
			expectedKey: "per_page",
		},
		{
			name:        "invalid album_id",
			queryParams: "album_id=abc",
			expectedKey: "album_id",
		},
		{
			name:        "invalid artist_id",
			queryParams: "artist_id=abc",
			expectedKey: "artist_id",
		},
		{
			name:        "invalid writer_id",
			queryParams: "writer_id=abc",
			expectedKey: "writer_id",
		},
		{
			name:        "invalid release_year",
			queryParams: "release_year=abc",
			expectedKey: "release_year",
		},
		{
			name:        "invalid playlist_id",
			queryParams: "playlist_id=abc",
			expectedKey: "playlist_id",
		},
		{
			name:        "invalid user_id",
			queryParams: "user_id=abc",
			expectedKey: "user_id",
		},
	}

	h := getHandler(tx)
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/songs?"+tc.queryParams, nil)
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
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}

			if _, ok := res.Errors[tc.expectedKey]; !ok {
				t.Errorf("expected error key %s not found", tc.expectedKey)
			}
		})
	}
}

func TestHandler_List_Filters(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, levelID2, albumID, artistID, writerID, playlistID, songID1, songID2 int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('intermediate') returning id").Scan(&levelID2)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into albums (name, release_year) values ('test album', 2022) returning id").Scan(&albumID)
	if err != nil {
		t.Fatalf("failed to insert albums: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into artists (name) values ('test artist') returning id").Scan(&artistID)
	if err != nil {
		t.Fatalf("failed to insert artists: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into writers (name) values ('test writer') returning id").Scan(&writerID)
	if err != nil {
		t.Fatalf("failed to insert writers: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('test playlist', $1) returning id", userID).Scan(&playlistID)
	if err != nil {
		t.Fatalf("failed to insert palylists: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id, level_id, release_year) values ('song 1', $1, $2, $3, 2022) returning id", userID, langID, levelID).Scan(&songID1)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, language_id, level_id) values ('song 2', $1, $2) returning id", langID, levelID2).Scan(&songID2)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into album_song (album_id, song_id) values ($1, $2)", albumID, songID1)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into artist_song (artist_id, song_id) values ($1, $2)", artistID, songID1)
	if err != nil {
		t.Fatalf("failed to insert artist_song: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into song_writer (writer_id, song_id) values ($1, $2)", writerID, songID1)
	if err != nil {
		t.Fatalf("failed to insert song_writer: %v", err)
	}
	_, err = tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2)", playlistID, songID1)
	if err != nil {
		t.Fatalf("failed to insert playlist_song: %v", err)
	}

	testCases := []struct {
		name          string
		queryParams   string
		expectedCount int
	}{
		{
			name:          "filter by album_id",
			queryParams:   fmt.Sprintf("album_id=%d", albumID),
			expectedCount: 1,
		},
		{
			name:          "filter by artist_id",
			queryParams:   fmt.Sprintf("artist_id=%d", artistID),
			expectedCount: 1,
		},
		{
			name:          "filter by writer_id",
			queryParams:   fmt.Sprintf("writer_id=%d", writerID),
			expectedCount: 1,
		},
		{
			name:          "filter by release_year",
			queryParams:   "release_year=2022",
			expectedCount: 1,
		},
		{
			name:          "filter by level_id",
			queryParams:   fmt.Sprintf("level_id=%d", levelID),
			expectedCount: 1,
		},
		{
			name:          "filter by playlist_id",
			queryParams:   fmt.Sprintf("playlist_id=%d", playlistID),
			expectedCount: 1,
		},
		{
			name:          "filter by search",
			queryParams:   "search=song 1",
			expectedCount: 1,
		},
		{
			name:          "filter by user",
			queryParams:   "user_id=100", // does not matter cuz will replace with current user
			expectedCount: 1,
		},
	}
	h := getHandler(tx)
	r, accessToken := testutil.AuthToken(t, userID)
	r.Get("/api/songs", h.List)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/songs?"+tc.queryParams, nil)
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if status := rr.Code; status != http.StatusOK {
				t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			var res handler.PageResponse[songsvc.Song]
			decoder := json.NewDecoder(rr.Body)
			decoder.DisallowUnknownFields()
			err = decoder.Decode(&res)
			if err != nil {
				t.Fatalf("Failed to decode or response format is wrong: %v", err)
			}

			if res.Total != tc.expectedCount {
				t.Errorf("unexpected number of items: got %d want %d", res.Total, tc.expectedCount)
			}
			if len(res.Data) != tc.expectedCount {
				t.Errorf("unexpected number of items: got %d want %d", len(res.Data), tc.expectedCount)
			}
		})
	}
}

func TestHandler_List_Trending(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, otherLevelID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('trend@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('french') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('advanced') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('expert') returning id").Scan(&otherLevelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}

	var topSongID, otherSongID, differentLevelSongID int
	err = tx.QueryRow(ctx, "insert into songs (title, language_id, level_id, created_by) values ('top song', $1, $2, $3) returning id", langID, levelID, userID).Scan(&topSongID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, language_id, level_id, created_by) values ('other song', $1, $2, $3) returning id", langID, levelID, userID).Scan(&otherSongID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, language_id, level_id, created_by) values ('different level song', $1, $2, $3) returning id", langID, otherLevelID, userID).Scan(&differentLevelSongID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}

	// Insert plays to create trending ordering.
	for i := 0; i < 3; i++ {
		_, err = tx.Exec(ctx, "insert into plays (song_id, user_id, created_at) values ($1, $2, now())", topSongID, userID)
		if err != nil {
			t.Fatalf("failed to insert plays: %v", err)
		}
	}
	_, err = tx.Exec(ctx, "insert into plays (song_id, user_id, created_at) values ($1, $2, now())", otherSongID, userID)
	if err != nil {
		t.Fatalf("failed to insert plays: %v", err)
	}
	for i := 0; i < 5; i++ {
		_, err = tx.Exec(ctx, "insert into plays (song_id, user_id, created_at) values ($1, $2, now())", differentLevelSongID, userID)
		if err != nil {
			t.Fatalf("failed to insert plays: %v", err)
		}
	}

	h := getHandler(tx)
	r, accessToken := testutil.AuthToken(t, userID)
	r.Get("/api/songs", h.List)

	req, err := http.NewRequest("GET", fmt.Sprintf("/api/songs?level_id=%d&is_trending=1", levelID), nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var res handler.PageResponse[songsvc.Song]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("Failed to decode or response format is wrong: %v", err)
	}

	if res.Total != 2 {
		t.Fatalf("unexpected number of items: got %d want %d", res.Total, 2)
	}
	if len(res.Data) != 2 {
		t.Fatalf("unexpected number of items: got %d want %d", len(res.Data), 2)
	}
	if res.Data[0].ID != topSongID {
		t.Fatalf("expected top song first, got song id %d", res.Data[0].ID)
	}
	if res.Data[1].ID != otherSongID {
		t.Fatalf("expected other song second, got song id %d", res.Data[1].ID)
	}
}

func TestHandler_List_IncludesPlaylistIDs(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID       int
		languageID   int
		firstSongID  int
		secondSongID int
		playlistID   int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('playlist@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('first song', $1, $2) returning id", userID, languageID).Scan(&firstSongID); err != nil {
		t.Fatalf("failed to insert first song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('second song', $1, $2) returning id", userID, languageID).Scan(&secondSongID); err != nil {
		t.Fatalf("failed to insert second song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('my playlist', $1) returning id", userID).Scan(&playlistID); err != nil {
		t.Fatalf("failed to insert playlist: %v", err)
	}

	if _, err := tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2)", playlistID, firstSongID); err != nil {
		t.Fatalf("failed to relate song to playlist: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Get("/api/songs", h.List)

	req, err := http.NewRequest("GET", fmt.Sprintf("/api/songs?user_id=%d", userID), nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	var res handler.PageResponse[songsvc.Song]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(res.Data) != 2 {
		t.Fatalf("unexpected song count: got %d want %d", len(res.Data), 2)
	}

	playlistBySong := make(map[int][]int, len(res.Data))
	for _, song := range res.Data {
		if song.PlaylistIDs == nil {
			t.Fatalf("expected playlist_ids to be an array for song %d", song.ID)
		}
		playlistBySong[song.ID] = song.PlaylistIDs
	}

	if got := playlistBySong[firstSongID]; len(got) != 1 || got[0] != playlistID {
		t.Fatalf("unexpected playlist ids for song %d: %+v", firstSongID, got)
	}
	if got := playlistBySong[secondSongID]; len(got) != 0 {
		t.Fatalf("expected no playlists for song %d, got %+v", secondSongID, got)
	}
}

func TestHandler_List_IncludesPlaylistIDsWithoutUserFilter(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID      int
		otherUserID int
		languageID  int
		ownedSongID int
		otherSongID int
		playlistID  int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('playlist-no-filter@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('playlist-no-filter@other.com', 'musician') returning id").Scan(&otherUserID); err != nil {
		t.Fatalf("failed to insert other user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('owned song', $1, $2) returning id", userID, languageID).Scan(&ownedSongID); err != nil {
		t.Fatalf("failed to insert owned song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('other song', $1, $2) returning id", otherUserID, languageID).Scan(&otherSongID); err != nil {
		t.Fatalf("failed to insert other song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('no filter playlist', $1) returning id", userID).Scan(&playlistID); err != nil {
		t.Fatalf("failed to insert playlist: %v", err)
	}

	if _, err := tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2)", playlistID, ownedSongID); err != nil {
		t.Fatalf("failed to relate song to playlist: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Get("/api/songs", h.List)

	req, err := http.NewRequest("GET", "/api/songs", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	var res handler.PageResponse[songsvc.Song]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(res.Data) != 2 {
		t.Fatalf("unexpected result length: got %d want %d", len(res.Data), 2)
	}

	playlistsBySong := make(map[int][]int, len(res.Data))
	for _, song := range res.Data {
		playlistsBySong[song.ID] = song.PlaylistIDs
	}

	if got := playlistsBySong[ownedSongID]; len(got) != 1 || got[0] != playlistID {
		t.Fatalf("unexpected playlist ids for owned song: %+v", got)
	}
	if got := playlistsBySong[otherSongID]; len(got) != 0 {
		t.Fatalf("expected no playlists for other song, got %+v", got)
	}
}

func TestHandler_List_IncludesCreatorMasking(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		activeUserID  int
		deletedUserID int
		languageID    int
		activeSongID  int
		deletedSongID int
		activeEmail   = "active@mail.com"
		inactiveEmail = "inactive@example.com"
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role, status) values ($1, 'musician', 'active') returning id", activeEmail).Scan(&activeUserID); err != nil {
		t.Fatalf("failed to insert active user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into users (email, role, status) values ($1, 'musician', 'deleted') returning id", inactiveEmail).Scan(&deletedUserID); err != nil {
		t.Fatalf("failed to insert deleted user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('active song', $1, $2) returning id", activeUserID, languageID).Scan(&activeSongID); err != nil {
		t.Fatalf("failed to insert active song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('deleted song', $1, $2) returning id", deletedUserID, languageID).Scan(&deletedSongID); err != nil {
		t.Fatalf("failed to insert deleted song: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, activeUserID)
	h := getHandler(tx)
	r.Get("/api/songs", h.List)

	req, err := http.NewRequest("GET", "/api/songs", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	var res handler.PageResponse[songsvc.Song]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(res.Data) != 2 {
		t.Fatalf("unexpected result length: got %d want %d", len(res.Data), 2)
	}

	found := make(map[int]songsvc.Song, len(res.Data))
	for _, song := range res.Data {
		found[song.ID] = song
	}

	activeSong, ok := found[activeSongID]
	if !ok {
		t.Fatalf("active song missing from response")
	}
	if activeSong.Created == nil || activeSong.Created.ID != activeUserID {
		t.Fatalf("expected creator information for active song")
	}
	if got := activeSong.Created.Email; got != activeEmail {
		t.Fatalf("unexpected email for active creator: got %s want %s", got, activeEmail)
	}

	deletedSong, ok := found[deletedSongID]
	if !ok {
		t.Fatalf("deleted song missing from response")
	}
	if deletedSong.Created == nil || deletedSong.Created.ID != deletedUserID {
		t.Fatalf("expected creator information for deleted song")
	}
	if got := deletedSong.Created.Email; got != "****@example.com" {
		t.Fatalf("unexpected email for deleted creator: got %s want %s", got, "****@example.com")
	}
}

func TestHandler_Create_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, artistID, writerID, albumID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert lanugage: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into artists (name) values ('test artist') returning id").Scan(&artistID)
	if err != nil {
		t.Fatalf("failed to insert artists: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into writers (name) values ('test writer') returning id").Scan(&writerID)
	if err != nil {
		t.Fatalf("failed to insert writers: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into albums (name) values ('test album') returning id").Scan(&albumID)
	if err != nil {
		t.Fatalf("failed to insert albums: %v", err)
	}

	payload := map[string]any{
		"title":        "test song",
		"level_id":     levelID,
		"language_id":  langID,
		"key":          "C",
		"lyric":        "test lyric",
		"release_year": 2022,
		"artist_ids":   []int{artistID},
		"writer_ids":   []int{writerID},
		"album_ids":    []int{albumID},
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "/api/songs", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	h := getHandler(tx)
	r.Post("/api/songs", h.Create)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var res handler.ResponseMessage[map[string]any]
	decoder := json.NewDecoder(rr.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		t.Fatalf("failed to decode or response format is wrong: %v", err)
	}

	if _, ok := res.Data["song_id"]; !ok {
		t.Errorf("song_id not found in response")
	}
}

func TestHandler_Create_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/songs", h.Create)

	testCases := []struct {
		name        string
		payload     map[string]any
		expectedKey string
	}{
		{"missing title", map[string]any{"level_id": 1, "language_id": 1, "lyric": "lyric"}, "title"},
		{"missing level_id", map[string]any{"title": "t", "language_id": 1, "lyric": "lyric"}, "level_id"},
		{"invalid level_id", map[string]any{"title": "t", "level_id": 0, "language_id": 1, "lyric": "lyric"}, "level_id"},
		{"missing language_id", map[string]any{"title": "t", "level_id": 1, "lyric": "lyric"}, "language_id"},
		{"invalid language_id", map[string]any{"title": "t", "level_id": 1, "language_id": 0, "lyric": "lyric"}, "language_id"},
		{"missing lyric", map[string]any{"title": "t", "level_id": 1, "language_id": 1}, "lyric"},
		{"invalid release_year", map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric", "release_year": 0}, "release_year"},
		{"invalid album_ids", map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric", "album_ids": []int{0}}, "album_ids"},
		{"invalid artist_ids", map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric", "artist_ids": []int{0}}, "artist_ids"},
		{"invalid writer_ids", map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric", "writer_ids": []int{0}}, "writer_ids"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(tc.payload)
			req, err := http.NewRequest("POST", "/api/songs", bytes.NewBuffer(body))
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
				t.Fatalf("failed to decode or response format is wrong: %v", err)
			}

			if _, ok := res.Errors[tc.expectedKey]; !ok {
				t.Errorf("expected error key %s not found", tc.expectedKey)
			}
		})
	}

	t.Run("unauthorized", func(t *testing.T) {
		payload := map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric"}
		body, _ := json.Marshal(payload)
		req, err := http.NewRequest("POST", "/api/songs", bytes.NewBuffer(body))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusUnauthorized {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusUnauthorized)
		}
	})
}

func TestHandler_Update_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, songID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id, level_id) values ('test song', $1, $2, $3) returning id", userID, langID, levelID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}

	payload := map[string]any{
		"title":       "updated song",
		"level_id":    levelID,
		"language_id": langID,
		"lyric":       "updated lyric",
	}
	body, _ := json.Marshal(payload)

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Put("/api/songs/{id}", h.Update)

	req, err := http.NewRequest("PUT", fmt.Sprintf("/api/songs/%d", songID), bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var updatedTitle string
	tx.QueryRow(ctx, "select title from songs where id = $1", songID).Scan(&updatedTitle)
	if updatedTitle != "updated song" {
		t.Errorf("song title was not updated")
	}
}

func TestHandler_Update_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, songID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id, level_id) values ('test song', $1, $2, $3) returning id", userID, langID, levelID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Put("/api/songs/{id}", h.Update)

	testCases := []struct {
		name               string
		songID             string
		payload            map[string]any
		authorized         bool
		expectedStatusCode int
	}{
		{"missing title", fmt.Sprintf("%d", songID), map[string]any{"level_id": 1, "language_id": 1, "lyric": "lyric"}, true, http.StatusUnprocessableEntity},
		{"unauthorized", fmt.Sprintf("%d", songID), map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric"}, false, http.StatusUnauthorized},
		{"invalid song id", "abc", map[string]any{"title": "t", "level_id": 1, "language_id": 1, "lyric": "lyric"}, true, http.StatusBadRequest},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(tc.payload)
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/songs/%s", tc.songID), bytes.NewBuffer(body))
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
		})
	}
}

func TestHandler_Delete_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID     int
		languageID int
		songID     int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('delete-success@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('delete me', $1, $2) returning id", userID, languageID).Scan(&songID); err != nil {
		t.Fatalf("failed to insert song: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Delete("/api/songs/{id}", h.Delete)

	req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/songs/%d", songID), nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	var remaining int
	if err := tx.QueryRow(ctx, "select count(1) from songs where id = $1", songID).Scan(&remaining); err != nil {
		t.Fatalf("failed to verify song removal: %v", err)
	}
	if remaining != 0 {
		t.Fatalf("expected song to be deleted, found %d rows", remaining)
	}
}

func TestHandler_Delete_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		ownerID     int
		otherUserID int
		languageID  int
		ownedSongID int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('delete-owner@user.com', 'musician') returning id").Scan(&ownerID); err != nil {
		t.Fatalf("failed to insert owner: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('delete-other@user.com', 'musician') returning id").Scan(&otherUserID); err != nil {
		t.Fatalf("failed to insert other user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('keep me', $1, $2) returning id", ownerID, languageID).Scan(&ownedSongID); err != nil {
		t.Fatalf("failed to insert song: %v", err)
	}

	r, ownerToken := testutil.AuthToken(t, ownerID)
	h := getHandler(tx)
	r.Delete("/api/songs/{id}", h.Delete)

	_, otherToken := testutil.AuthToken(t, otherUserID)

	testCases := []struct {
		name               string
		targetID           string
		authorizationToken *string
		expectedStatus     int
	}{
		{
			name:               "unauthorized",
			targetID:           fmt.Sprintf("%d", ownedSongID),
			authorizationToken: nil,
			expectedStatus:     http.StatusUnauthorized,
		},
		{
			name:               "invalid id",
			targetID:           "abc",
			authorizationToken: &ownerToken,
			expectedStatus:     http.StatusBadRequest,
		},
		{
			name:               "not owner",
			targetID:           fmt.Sprintf("%d", ownedSongID),
			authorizationToken: &otherToken,
			expectedStatus:     http.StatusNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/songs/%s", tc.targetID), nil)
			if err != nil {
				t.Fatal(err)
			}
			if tc.authorizationToken != nil {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", *tc.authorizationToken))
			}

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if status := rr.Code; status != tc.expectedStatus {
				t.Fatalf("unexpected status: got %d want %d", status, tc.expectedStatus)
			}
		})
	}
}

func TestHandler_UpdateStatus_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID     int
		languageID int
		levelID    int
		songID     int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('status-success@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID); err != nil {
		t.Fatalf("failed to insert level: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id, level_id, status) values ('status song', $1, $2, $3, 'created') returning id", userID, languageID, levelID).Scan(&songID); err != nil {
		t.Fatalf("failed to insert song: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/songs/{id}/status/{status}", h.UpdateStatus)

	req, err := http.NewRequest("POST", fmt.Sprintf("/api/songs/%d/status/pending", songID), nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	var updatedStatus string
	if err := tx.QueryRow(ctx, "select status from songs where id = $1", songID).Scan(&updatedStatus); err != nil {
		t.Fatalf("failed to fetch updated status: %v", err)
	}
	if updatedStatus != "pending" {
		t.Fatalf("expected status to be pending, got %s", updatedStatus)
	}
}

func TestHandler_UpdateStatus_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		ownerID     int
		otherUserID int
		languageID  int
		levelID     int
		songID      int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('status-owner@user.com', 'musician') returning id").Scan(&ownerID); err != nil {
		t.Fatalf("failed to insert owner: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('status-other@user.com', 'musician') returning id").Scan(&otherUserID); err != nil {
		t.Fatalf("failed to insert other user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID); err != nil {
		t.Fatalf("failed to insert level: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id, level_id, status) values ('status song', $1, $2, $3, 'created') returning id", ownerID, languageID, levelID).Scan(&songID); err != nil {
		t.Fatalf("failed to insert song: %v", err)
	}

	r, ownerToken := testutil.AuthToken(t, ownerID)
	h := getHandler(tx)
	r.Post("/api/songs/{id}/status/{status}", h.UpdateStatus)

	_, otherToken := testutil.AuthToken(t, otherUserID)

	testCases := []struct {
		name           string
		targetID       string
		status         string
		token          *string
		expectedStatus int
	}{
		{
			name:           "unauthorized",
			targetID:       fmt.Sprintf("%d", songID),
			status:         "pending",
			token:          nil,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "invalid id",
			targetID:       "abc",
			status:         "pending",
			token:          &ownerToken,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid status",
			targetID:       fmt.Sprintf("%d", songID),
			status:         "approved",
			token:          &ownerToken,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "not owner",
			targetID:       fmt.Sprintf("%d", songID),
			status:         "pending",
			token:          &otherToken,
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("POST", fmt.Sprintf("/api/songs/%s/status/%s", tc.targetID, tc.status), nil)
			if err != nil {
				t.Fatal(err)
			}
			if tc.token != nil {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", *tc.token))
			}

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if status := rr.Code; status != tc.expectedStatus {
				t.Fatalf("unexpected status: got %d want %d", status, tc.expectedStatus)
			}
		})
	}
}

func TestHandler_SyncPlaylists_ReplacesState(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID        int
		otherUserID   int
		languageID    int
		songID        int
		playlistOneID int
		playlistTwoID int
		otherPlayID   int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('sync@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('other@user.com', 'musician') returning id").Scan(&otherUserID); err != nil {
		t.Fatalf("failed to insert other user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('sync song', $1, $2) returning id", userID, languageID).Scan(&songID); err != nil {
		t.Fatalf("failed to insert song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('playlist-one', $1) returning id", userID).Scan(&playlistOneID); err != nil {
		t.Fatalf("failed to insert playlist one: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('playlist-two', $1) returning id", userID).Scan(&playlistTwoID); err != nil {
		t.Fatalf("failed to insert playlist two: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('other-playlist', $1) returning id", otherUserID).Scan(&otherPlayID); err != nil {
		t.Fatalf("failed to insert other playlist: %v", err)
	}

	if _, err := tx.Exec(ctx, "insert into playlist_song (playlist_id, song_id) values ($1, $2), ($3, $2)", playlistOneID, songID, otherPlayID); err != nil {
		t.Fatalf("failed to seed playlist_song: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/songs/{song_id}/playlists", h.SyncPlaylists)

	payload := map[string]any{
		"playlist_ids": []int{playlistTwoID},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("/api/songs/%d/playlists", songID), bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("unexpected status code: got %d want %d", status, http.StatusOK)
	}

	rows, err := tx.Query(ctx, "select playlist_id from playlist_song where song_id = $1 order by playlist_id asc", songID)
	if err != nil {
		t.Fatalf("failed to query playlist songs: %v", err)
	}
	defer rows.Close()

	var got []int
	for rows.Next() {
		var playlistID int
		if err := rows.Scan(&playlistID); err != nil {
			t.Fatalf("failed to scan playlist id: %v", err)
		}
		got = append(got, playlistID)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iteration error: %v", err)
	}

	expected := []int{otherPlayID, playlistTwoID}
	if len(got) != len(expected) {
		t.Fatalf("unexpected playlist count: got %d want %d", len(got), len(expected))
	}

	for _, id := range expected {
		found := false
		for _, actual := range got {
			if actual == id {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected playlist %d not found", id)
		}
	}
}

func TestHandler_SyncPlaylists_Validation(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var (
		userID      int
		otherUserID int
		languageID  int
		songID      int
		ownPlaylist int
		otherPlayID int
	)

	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('sync-val@user.com', 'musician') returning id").Scan(&userID); err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into users (email, role) values ('sync-val-other@user.com', 'musician') returning id").Scan(&otherUserID); err != nil {
		t.Fatalf("failed to insert other user: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into languages (name) values ('spanish') returning id").Scan(&languageID); err != nil {
		t.Fatalf("failed to insert language: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('validate song', $1, $2) returning id", userID, languageID).Scan(&songID); err != nil {
		t.Fatalf("failed to insert song: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('own-playlist', $1) returning id", userID).Scan(&ownPlaylist); err != nil {
		t.Fatalf("failed to insert own playlist: %v", err)
	}
	if err := tx.QueryRow(ctx, "insert into playlists (name, user_id) values ('other', $1) returning id", otherUserID).Scan(&otherPlayID); err != nil {
		t.Fatalf("failed to insert other playlist: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/songs/{song_id}/playlists", h.SyncPlaylists)

	testCases := []struct {
		name               string
		songID             string
		body               map[string]any
		authorized         bool
		expectedStatusCode int
	}{
		{
			name:               "missing authorization",
			songID:             fmt.Sprintf("%d", songID),
			body:               map[string]any{"playlist_ids": []int{ownPlaylist}},
			authorized:         false,
			expectedStatusCode: http.StatusUnauthorized,
		},
		{
			name:               "invalid song id",
			songID:             "abc",
			body:               map[string]any{"playlist_ids": []int{ownPlaylist}},
			authorized:         true,
			expectedStatusCode: http.StatusUnprocessableEntity,
		},
		{
			name:               "missing playlist ids",
			songID:             fmt.Sprintf("%d", songID),
			body:               map[string]any{},
			authorized:         true,
			expectedStatusCode: http.StatusUnprocessableEntity,
		},
		{
			name:               "unauthorized playlist",
			songID:             fmt.Sprintf("%d", songID),
			body:               map[string]any{"playlist_ids": []int{otherPlayID}},
			authorized:         true,
			expectedStatusCode: http.StatusUnauthorized,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, err := json.Marshal(tc.body)
			if err != nil {
				t.Fatalf("failed to marshal body: %v", err)
			}

			req, err := http.NewRequest("POST", fmt.Sprintf("/api/songs/%s/playlists", tc.songID), bytes.NewBuffer(body))
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Content-Type", "application/json")
			if tc.authorized {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
			}

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if status := rr.Code; status != tc.expectedStatusCode {
				t.Errorf("handler returned wrong status code: got %v want %v", status, tc.expectedStatusCode)
			}
		})
	}
}

func TestHandler_AssignLevel_Success(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, songID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('test song', $1, $2) returning id", userID, langID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/songs/{song_id}/levels/{level_id}", h.AssignLevel)

	req, err := http.NewRequest("POST", fmt.Sprintf("/api/songs/%d/levels/%d", songID, levelID), nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var updatedLevelID int
	tx.QueryRow(ctx, "select level_id from songs where id = $1", songID).Scan(&updatedLevelID)
	if updatedLevelID != levelID {
		t.Errorf("song level was not updated")
	}
}

func TestHandler_AssignLevel_Fail(t *testing.T) {
	conn := testutil.SetupDB(t)
	defer conn.Close()

	ctx := context.Background()
	tx, _ := conn.Begin(ctx)
	defer tx.Rollback(ctx)

	var userID, langID, levelID, songID int
	err := tx.QueryRow(ctx, "insert into users (email, role) values ('test@user.com', 'musician') returning id").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to insert users: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into languages (name) values ('english') returning id").Scan(&langID)
	if err != nil {
		t.Fatalf("failed to insert languages: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into levels (name) values ('beginner') returning id").Scan(&levelID)
	if err != nil {
		t.Fatalf("failed to insert levels: %v", err)
	}
	err = tx.QueryRow(ctx, "insert into songs (title, created_by, language_id) values ('test song', $1, $2) returning id", userID, langID).Scan(&songID)
	if err != nil {
		t.Fatalf("failed to insert songs: %v", err)
	}

	r, accessToken := testutil.AuthToken(t, userID)
	h := getHandler(tx)
	r.Post("/api/songs/{song_id}/levels/{level_id}", h.AssignLevel)

	testCases := []struct {
		name               string
		songID             string
		levelID            string
		authorized         bool
		expectedStatusCode int
	}{
		{"unauthorized", fmt.Sprintf("%d", songID), fmt.Sprintf("%d", levelID), false, http.StatusUnauthorized},
		{"invalid song id", "abc", fmt.Sprintf("%d", levelID), true, http.StatusBadRequest},
		{"invalid level id", fmt.Sprintf("%d", songID), "abc", true, http.StatusBadRequest},
		{"song not found", "999", fmt.Sprintf("%d", levelID), true, http.StatusNotFound},
		{"level not found", fmt.Sprintf("%d", songID), "999", true, http.StatusBadRequest},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("POST", fmt.Sprintf("/api/songs/%s/levels/%s", tc.songID, tc.levelID), nil)
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
		})
	}
}
