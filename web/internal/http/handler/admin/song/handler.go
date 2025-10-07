package song

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/a-h/templ"

	adminctx "github.com/lyricapp/lyric/web/internal/http/context/admin"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
	"github.com/lyricapp/lyric/web/internal/web/components"
)

// Handler renders and processes the admin song creation form.
type Handler struct {
	songs   songsvc.Service
	albums  albumsvc.Service
	artists artistsvc.Service
	writers writersvc.Service
}

var (
	allowedLevels    = map[string]struct{}{"easy": {}, "medium": {}, "hard": {}}
	allowedLanguages = map[string]struct{}{"english": {}, "burmese": {}}
)

// New constructs a song admin handler with the required dependencies.
func New(songs songsvc.Service, albums albumsvc.Service, artists artistsvc.Service, writers writersvc.Service) *Handler {
	return &Handler{songs: songs, albums: albums, artists: artists, writers: writers}
}

// Show displays the song creation form.
func (h *Handler) Show(w http.ResponseWriter, r *http.Request) {
	user, ok := adminctx.FromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	lookups, err := h.fetchLookups(r)
	if err != nil {
		http.Error(w, "failed to load admin data", http.StatusInternalServerError)
		return
	}

	props := components.AdminSongCreateProps{
		Values:      defaultSongValues(),
		FieldErrors: map[string]string{},
		Artists:     lookups.artists,
		Writers:     lookups.writers,
		Albums:      lookups.albums,
		Levels:      buildLevelOptions(""),
		Languages:   buildLanguageOptions(""),
		CurrentUser: user.Username,
	}

	if r.URL.Query().Get("created") == "1" {
		props.Success = true
	}

	templ.Handler(components.AdminSongCreatePage(props)).ServeHTTP(w, r)
}

// Create handles the POST submission to persist a new song.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	user, ok := adminctx.FromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid form submission", http.StatusBadRequest)
		return
	}

	values := components.AdminSongFormValues{
		Title:           strings.TrimSpace(r.FormValue("title")),
		Level:           strings.ToLower(strings.TrimSpace(r.FormValue("level"))),
		Key:             strings.TrimSpace(r.FormValue("key")),
		Language:        strings.ToLower(strings.TrimSpace(r.FormValue("language"))),
		ReleaseYear:     strings.TrimSpace(r.FormValue("release_year")),
		AlbumID:         strings.TrimSpace(r.FormValue("album_id")),
		PrimaryWriterID: strings.TrimSpace(r.FormValue("primary_writer_id")),
		ArtistIDs:       r.Form["artist_ids"],
		WriterIDs:       r.Form["writer_ids"],
		Lyric:           r.FormValue("lyric"),
	}

	fieldErrors := make(map[string]string)
	errorsList := make([]string, 0)

	if values.Title == "" {
		fieldErrors["title"] = "Title is required."
	}

	if values.Level != "" {
		if _, ok := allowedLevels[values.Level]; !ok {
			fieldErrors["level"] = "Choose a valid level."
		}
	}

	if values.Language != "" {
		if _, ok := allowedLanguages[values.Language]; !ok {
			fieldErrors["language"] = "Choose a valid language."
		}
	}

	releaseYear, err := parseOptionalInt(values.ReleaseYear)
	if err != nil {
		fieldErrors["release_year"] = "Release year must be a number."
	}

	albumID, err := parseOptionalInt(values.AlbumID)
	if err != nil {
		fieldErrors["album_id"] = "Album must be a valid number."
	}

	primaryWriterID, err := parseOptionalInt(values.PrimaryWriterID)
	if err != nil {
		fieldErrors["primary_writer_id"] = "Primary writer must be a valid number."
	}

	artistIDs, err := parseIDList(values.ArtistIDs)
	if err != nil {
		fieldErrors["artist_ids"] = "Artist selection must contain numeric IDs."
	}

	writerIDs, err := parseIDList(values.WriterIDs)
	if err != nil {
		fieldErrors["writer_ids"] = "Writer selection must contain numeric IDs."
	}

	lookups, lookupErr := h.fetchLookups(r)
	if lookupErr != nil {
		templ.Handler(components.AdminSongCreatePage(components.AdminSongCreateProps{
			Values:      values,
			Errors:      []string{"Unable to load supporting data."},
			FieldErrors: fieldErrors,
			Artists:     markSelected(lookups.artists, values.ArtistIDs),
			Writers:     markSelected(lookups.writers, values.WriterIDs),
			Albums:      markSelectedSingle(lookups.albums, values.AlbumID),
			Levels:      buildLevelOptions(values.Level),
			Languages:   buildLanguageOptions(values.Language),
			CurrentUser: user.Username,
		})).ServeHTTP(w, r)
		return
	}

	if len(fieldErrors) > 0 || len(errorsList) > 0 {
		props := components.AdminSongCreateProps{
			Values:      values,
			Errors:      errorsList,
			FieldErrors: fieldErrors,
			Artists:     markSelected(lookups.artists, values.ArtistIDs),
			Writers:     markSelected(lookups.writers, values.WriterIDs),
			Albums:      markSelectedSingle(lookups.albums, values.AlbumID),
			Levels:      buildLevelOptions(values.Level),
			Languages:   buildLanguageOptions(values.Language),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongCreatePage(props)).ServeHTTP(w, r)
		return
	}

	params := songsvc.CreateParams{
		Title:     values.Title,
		ArtistIDs: artistIDs,
		WriterIDs: writerIDs,
	}

	if values.Level != "" {
		params.Level = &values.Level
	}
	if values.Key != "" {
		params.Key = &values.Key
	}
	if values.Language != "" {
		params.Language = &values.Language
	}
	if strings.TrimSpace(values.Lyric) != "" {
		lyric := values.Lyric
		params.Lyric = &lyric
	}
	if releaseYear != nil {
		params.ReleaseYear = releaseYear
	}
	if albumID != nil {
		params.AlbumID = albumID
	}
	if primaryWriterID != nil {
		params.PrimaryWriterID = primaryWriterID
	}

	createdBy := user.ID
	params.CreatedBy = &createdBy

	if _, err := h.songs.Create(r.Context(), params); err != nil {
		errorsList = append(errorsList, "Failed to save the song. Please try again.")
		props := components.AdminSongCreateProps{
			Values:      values,
			Errors:      errorsList,
			FieldErrors: fieldErrors,
			Artists:     markSelected(lookups.artists, values.ArtistIDs),
			Writers:     markSelected(lookups.writers, values.WriterIDs),
			Albums:      markSelectedSingle(lookups.albums, values.AlbumID),
			Levels:      buildLevelOptions(values.Level),
			Languages:   buildLanguageOptions(values.Language),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongCreatePage(props)).ServeHTTP(w, r)
		return
	}

	http.Redirect(w, r, "/admin/song/create?created=1", http.StatusFound)
}

func (h *Handler) fetchLookups(r *http.Request) (struct {
	artists []components.AdminSongOption
	writers []components.AdminSongOption
	albums  []components.AdminSongOption
}, error) {
	ctx := r.Context()

	artistsResult, err := h.artists.List(ctx, artistsvc.ListParams{Page: 1, PerPage: 100})
	if err != nil {
		return struct {
			artists []components.AdminSongOption
			writers []components.AdminSongOption
			albums  []components.AdminSongOption
		}{}, err
	}

	writersResult, err := h.writers.List(ctx, writersvc.ListParams{Page: 1, PerPage: 100})
	if err != nil {
		return struct {
			artists []components.AdminSongOption
			writers []components.AdminSongOption
			albums  []components.AdminSongOption
		}{}, err
	}

	albumsResult, err := h.albums.List(ctx, albumsvc.ListParams{Page: 1, PerPage: 100})
	if err != nil {
		return struct {
			artists []components.AdminSongOption
			writers []components.AdminSongOption
			albums  []components.AdminSongOption
		}{}, err
	}

	lookups := struct {
		artists []components.AdminSongOption
		writers []components.AdminSongOption
		albums  []components.AdminSongOption
	}{
		artists: make([]components.AdminSongOption, 0, len(artistsResult.Data)),
		writers: make([]components.AdminSongOption, 0, len(writersResult.Data)),
		albums:  make([]components.AdminSongOption, 0, len(albumsResult.Data)),
	}

	for _, artist := range artistsResult.Data {
		lookups.artists = append(lookups.artists, components.AdminSongOption{
			Value: strconv.Itoa(artist.ID),
			Label: artist.Name,
		})
	}

	for _, writer := range writersResult.Data {
		lookups.writers = append(lookups.writers, components.AdminSongOption{
			Value: strconv.Itoa(writer.ID),
			Label: writer.Name,
		})
	}

	for _, album := range albumsResult.Data {
		label := album.Name
		if album.ReleaseYear != nil {
			label = fmt.Sprintf("%s (%d)", label, *album.ReleaseYear)
		}
		lookups.albums = append(lookups.albums, components.AdminSongOption{
			Value: strconv.Itoa(album.ID),
			Label: label,
		})
	}

	return lookups, nil
}

func defaultSongValues() components.AdminSongFormValues {
	return components.AdminSongFormValues{
		ArtistIDs: []string{},
		WriterIDs: []string{},
	}
}

func parseOptionalInt(raw string) (*int, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return nil, err
	}
	if value <= 0 {
		return nil, errors.New("value must be positive")
	}
	return &value, nil
}

func parseIDList(values []string) ([]int, error) {
	if len(values) == 0 {
		return []int{}, nil
	}

	ids := make([]int, 0, len(values))

	for _, raw := range values {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		value, err := strconv.Atoi(trimmed)
		if err != nil {
			return nil, err
		}
		if value <= 0 {
			return nil, errors.New("identifier must be positive")
		}
		ids = append(ids, value)
	}

	return ids, nil
}

func markSelected(options []components.AdminSongOption, selectedValues []string) []components.AdminSongOption {
	if len(options) == 0 {
		return options
	}

	selected := make(map[string]struct{}, len(selectedValues))
	for _, value := range selectedValues {
		selected[strings.TrimSpace(value)] = struct{}{}
	}

	marked := make([]components.AdminSongOption, len(options))
	for i, option := range options {
		option.Selected = false
		if _, ok := selected[option.Value]; ok {
			option.Selected = true
		}
		marked[i] = option
	}
	return marked
}

func markSelectedSingle(options []components.AdminSongOption, selectedValue string) []components.AdminSongOption {
	marked := make([]components.AdminSongOption, len(options))
	for i, option := range options {
		option.Selected = option.Value == selectedValue
		marked[i] = option
	}
	return marked
}

func buildLevelOptions(selected string) []components.AdminSongOption {
	levels := []components.AdminSongOption{
		{Value: "easy", Label: "Easy"},
		{Value: "medium", Label: "Medium"},
		{Value: "hard", Label: "Hard"},
	}
	selected = strings.ToLower(strings.TrimSpace(selected))
	for i, option := range levels {
		levels[i].Selected = option.Value == selected
	}
	return levels
}

func buildLanguageOptions(selected string) []components.AdminSongOption {
	languages := []components.AdminSongOption{
		{Value: "english", Label: "English"},
		{Value: "burmese", Label: "Burmese"},
	}
	selected = strings.ToLower(strings.TrimSpace(selected))
	for i, option := range languages {
		languages[i].Selected = option.Value == selected
	}
	return languages
}
