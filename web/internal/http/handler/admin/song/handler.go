package song

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/a-h/templ"
	"github.com/go-chi/chi/v5"

	adminctx "github.com/lyricapp/lyric/web/internal/http/context/admin"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
	levelsvc "github.com/lyricapp/lyric/web/internal/services/levels"
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
	levels  levelsvc.Service
}

var allowedLanguages = map[string]struct{}{"english": {}, "burmese": {}}

// New constructs a song admin handler with the required dependencies.
func New(songs songsvc.Service, albums albumsvc.Service, artists artistsvc.Service, writers writersvc.Service, levels levelsvc.Service) *Handler {
	return &Handler{songs: songs, albums: albums, artists: artists, writers: writers, levels: levels}
}

// Index renders the admin song list with optional search.
func (h *Handler) Index(w http.ResponseWriter, r *http.Request) {
	user, ok := adminctx.FromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	searchTerm := strings.TrimSpace(r.URL.Query().Get("q"))

	list, err := h.songs.List(r.Context(), songsvc.ListParams{
		Page:    1,
		PerPage: 50,
		Search:  searchTerm,
	})
	if err != nil {
		http.Error(w, "failed to load songs", http.StatusInternalServerError)
		return
	}

	items := make([]components.AdminSongListItem, 0, len(list.Data))
	for _, song := range list.Data {
		items = append(items, components.AdminSongListItem{
			ID:      song.ID,
			Title:   song.Title,
			Artists: joinNames(song.Artists),
			Writers: joinNames(song.Writers),
			Level:   levelNameOrDash(song.Level),
			// Language:    pointerToHuman(song.Language),
			ReleaseYear: releaseYearOrDash(song.ReleaseYear),
		})
	}

	resultsLabel := "songs"
	if list.Total == 1 {
		resultsLabel = "song"
	}

	props := components.AdminSongListProps{
		SearchTerm:   searchTerm,
		Total:        list.Total,
		Songs:        items,
		CurrentUser:  user.Username,
		ResultsLabel: resultsLabel,
	}

	templ.Handler(components.AdminSongListPage(props)).ServeHTTP(w, r)
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
		Levels:      lookups.levels,
		Languages:   buildLanguageOptions(""),
		CurrentUser: user.Username,
	}

	if r.URL.Query().Get("created") == "1" {
		props.Success = true
		props.SuccessText = "Song created successfully."
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

	payload, err := parseSongForm(r)
	if err != nil {
		http.Error(w, "invalid form submission", http.StatusBadRequest)
		return
	}

	lookups, lookupErr := h.fetchLookups(r)
	if lookupErr != nil {
		payload.Errors = append(payload.Errors, "Unable to load supporting data.")
		props := components.AdminSongCreateProps{
			Values:      payload.Values,
			Errors:      payload.Errors,
			FieldErrors: payload.FieldErrors,
			Artists:     markSelected(lookups.artists, payload.Values.ArtistIDs),
			Writers:     markSelected(lookups.writers, payload.Values.WriterIDs),
			Albums:      markSelected(lookups.albums, payload.Values.AlbumIDs),
			Levels:      markSelected(lookups.levels, []string{payload.Values.LevelID}),
			Languages:   markSelected(lookups.languages, []string{payload.Values.LanguageID}),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongCreatePage(props)).ServeHTTP(w, r)
		return
	}

	if len(payload.FieldErrors) > 0 || len(payload.Errors) > 0 {
		props := components.AdminSongCreateProps{
			Values:      payload.Values,
			Errors:      payload.Errors,
			FieldErrors: payload.FieldErrors,
			Artists:     markSelected(lookups.artists, payload.Values.ArtistIDs),
			Writers:     markSelected(lookups.writers, payload.Values.WriterIDs),
			Albums:      markSelected(lookups.albums, payload.Values.AlbumIDs),
			Levels:      markSelected(lookups.levels, []string{payload.Values.LevelID}),
			Languages:   markSelected(lookups.levels, []string{payload.Values.LanguageID}),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongCreatePage(props)).ServeHTTP(w, r)
		return
	}

	params := songsvc.CreateParams{
		MutationParams: songsvc.MutationParams{
			Title:     payload.Values.Title,
			ArtistIDs: payload.ArtistIDs,
			WriterIDs: payload.WriterIDs,
			AlbumIDs:  payload.AlbumIDs,
		},
	}

	if payload.LevelID != nil {
		params.LevelID = payload.LevelID
	}
	if payload.LanguageID != 0 {
		params.LanguageID = payload.LanguageID
	}
	if payload.Values.Key != "" {
		key := payload.Values.Key
		params.Key = &key
	}
	if strings.TrimSpace(payload.Values.Lyric) != "" {
		lyric := payload.Values.Lyric
		params.Lyric = &lyric
	}
	if payload.ReleaseYear != nil {
		params.ReleaseYear = payload.ReleaseYear
	}

	createdBy := user.ID
	params.CreatedBy = &createdBy

	if _, err := h.songs.Create(r.Context(), params); err != nil {
		payload.Errors = append(payload.Errors, "Failed to save the song. Please try again.")
		props := components.AdminSongCreateProps{
			Values:      payload.Values,
			Errors:      payload.Errors,
			FieldErrors: payload.FieldErrors,
			Artists:     markSelected(lookups.artists, payload.Values.ArtistIDs),
			Writers:     markSelected(lookups.writers, payload.Values.WriterIDs),
			Albums:      markSelected(lookups.albums, payload.Values.AlbumIDs),
			Levels:      markSelected(lookups.levels, []string{payload.Values.LevelID}),
			Languages:   buildLanguageOptions(payload.Values.LanguageID),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongCreatePage(props)).ServeHTTP(w, r)
		return
	}

	http.Redirect(w, r, "/admin/songs/create?created=1", http.StatusFound)
}

// Edit loads an existing song and renders the edit form.
func (h *Handler) Edit(w http.ResponseWriter, r *http.Request) {
	user, ok := adminctx.FromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	songID, err := strconv.Atoi(rawID)
	if err != nil || songID <= 0 {
		http.NotFound(w, r)
		return
	}

	song, err := h.songs.Get(r.Context(), songID)
	if err != nil {
		if errors.Is(err, songsvc.ErrNotFound) {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "failed to load song", http.StatusInternalServerError)
		return
	}

	lookups, lookupErr := h.fetchLookups(r)
	if lookupErr != nil {
		http.Error(w, "failed to load admin data", http.StatusInternalServerError)
		return
	}

	values := buildValuesFromSong(song)

	props := components.AdminSongEditProps{
		SongID:      songID,
		Values:      values,
		FieldErrors: map[string]string{},
		Artists:     markSelected(lookups.artists, values.ArtistIDs),
		Writers:     markSelected(lookups.writers, values.WriterIDs),
		Albums:      markSelected(lookups.albums, values.AlbumIDs),
		Levels:      markSelected(lookups.levels, []string{values.LevelID}),
		Languages:   markSelected(lookups.languages, []string{values.LanguageID}),
		CurrentUser: user.Username,
	}

	if r.URL.Query().Get("updated") == "1" {
		props.Success = true
		props.SuccessText = "Song updated successfully."
	}

	templ.Handler(components.AdminSongEditPage(props)).ServeHTTP(w, r)
}

// Update processes the edit form submission for an existing song.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	user, ok := adminctx.FromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	songID, err := strconv.Atoi(rawID)
	if err != nil || songID <= 0 {
		http.NotFound(w, r)
		return
	}

	payload, parseErr := parseSongForm(r)
	if parseErr != nil {
		http.Error(w, "invalid form submission", http.StatusBadRequest)
		return
	}

	lookups, lookupErr := h.fetchLookups(r)
	if lookupErr != nil {
		payload.Errors = append(payload.Errors, "Unable to load supporting data.")
		props := components.AdminSongEditProps{
			SongID:      songID,
			Values:      payload.Values,
			Errors:      payload.Errors,
			FieldErrors: payload.FieldErrors,
			Artists:     markSelected(lookups.artists, payload.Values.ArtistIDs),
			Writers:     markSelected(lookups.writers, payload.Values.WriterIDs),
			Albums:      markSelected(lookups.albums, payload.Values.AlbumIDs),
			Levels:      markSelected(lookups.levels, []string{payload.Values.LevelID}),
			Languages:   markSelected(lookups.languages, []string{payload.Values.LanguageID}),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongEditPage(props)).ServeHTTP(w, r)
		return
	}

	if len(payload.FieldErrors) > 0 || len(payload.Errors) > 0 {
		props := components.AdminSongEditProps{
			SongID:      songID,
			Values:      payload.Values,
			Errors:      payload.Errors,
			FieldErrors: payload.FieldErrors,
			Artists:     markSelected(lookups.artists, payload.Values.ArtistIDs),
			Writers:     markSelected(lookups.writers, payload.Values.WriterIDs),
			Albums:      markSelected(lookups.albums, payload.Values.AlbumIDs),
			Levels:      markSelected(lookups.levels, []string{payload.Values.LevelID}),
			Languages:      markSelected(lookups.languages, []string{payload.Values.LanguageID}),
			CurrentUser: user.Username,
		}
		templ.Handler(components.AdminSongEditPage(props)).ServeHTTP(w, r)
		return
	}

	params := songsvc.UpdateParams{
		MutationParams: songsvc.MutationParams{
			Title:     payload.Values.Title,
			ArtistIDs: payload.ArtistIDs,
			WriterIDs: payload.WriterIDs,
			AlbumIDs:  payload.AlbumIDs,
		},
	}

	if payload.LevelID != nil {
		params.LevelID = payload.LevelID
	}
	if payload.LanguageID != 0 {
		params.LanguageID = payload.LanguageID
	}
	if payload.Values.Key != "" {
		key := payload.Values.Key
		params.Key = &key
	}
	if strings.TrimSpace(payload.Values.Lyric) != "" {
		lyric := payload.Values.Lyric
		params.Lyric = &lyric
	}
	if payload.ReleaseYear != nil {
		params.ReleaseYear = payload.ReleaseYear
	}

	if err := h.songs.Update(r.Context(), songID, params); err != nil {
		if errors.Is(err, songsvc.ErrNotFound) {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "failed to update song", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/admin/songs/%d/edit?updated=1", songID), http.StatusFound)
}

// Delete removes a song and redirects back to the listing.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := adminctx.FromContext(r.Context()); !ok {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	songID, err := strconv.Atoi(rawID)
	if err != nil || songID <= 0 {
		http.NotFound(w, r)
		return
	}

	searchTerm := strings.TrimSpace(r.FormValue("q"))

	if err := h.songs.Delete(r.Context(), songID); err != nil && !errors.Is(err, songsvc.ErrNotFound) {
		http.Error(w, "failed to delete song", http.StatusInternalServerError)
		return
	}

	redirectURL := "/admin/songs"
	if searchTerm != "" {
		redirectURL = "/admin/songs?q=" + url.QueryEscape(searchTerm)
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

type songFormPayload struct {
	Values      components.AdminSongFormValues
	FieldErrors map[string]string
	Errors      []string
	LevelID     *int
	LanguageID  int
	ReleaseYear *int
	AlbumIDs    []int
	ArtistIDs   []int
	WriterIDs   []int
}

func parseSongForm(r *http.Request) (songFormPayload, error) {
	payload := songFormPayload{
		Values: components.AdminSongFormValues{
			AlbumIDs:  []string{},
			ArtistIDs: []string{},
			WriterIDs: []string{},
		},
		FieldErrors: map[string]string{},
		Errors:      []string{},
	}

	if err := r.ParseForm(); err != nil {
		return payload, err
	}

	payload.Values.Title = strings.TrimSpace(r.FormValue("title"))
	payload.Values.LevelID = strings.TrimSpace(r.FormValue("level_id"))
	payload.Values.Key = strings.TrimSpace(r.FormValue("key"))
	payload.Values.LanguageID = strings.ToLower(strings.TrimSpace(r.FormValue("language_id")))
	payload.Values.ReleaseYear = strings.TrimSpace(r.FormValue("release_year"))
	payload.Values.AlbumIDs = r.Form["album_ids"]
	payload.Values.ArtistIDs = r.Form["artist_ids"]
	payload.Values.WriterIDs = r.Form["writer_ids"]
	payload.Values.Lyric = r.FormValue("lyric")

	if payload.Values.Title == "" {
		payload.FieldErrors["title"] = "Title is required."
	}

	if payload.Values.LevelID == "" {
		payload.FieldErrors["level_id"] = "Level is required."
	} else {
		levelID, err := strconv.Atoi(payload.Values.LevelID)
		if err != nil || levelID <= 0 {
			payload.FieldErrors["level_id"] = "Choose a valid level."
		} else {
			payload.LevelID = &levelID
		}
	}
	if payload.Values.LanguageID == "" {
		payload.FieldErrors["language_id"] = "Language is required."
	} else {
		languageID, err := strconv.Atoi(payload.Values.LanguageID)
		if err != nil || languageID <= 0 {
			payload.FieldErrors["language_id"] = "Choose a valid language."
		} else {
			payload.LanguageID = languageID
		}
	}
	releaseYear, err := parseOptionalInt(payload.Values.ReleaseYear)
	if err != nil {
		payload.FieldErrors["release_year"] = "Release year must be a number."
	} else {
		payload.ReleaseYear = releaseYear
	}

	if albumIDs, err := parseIDList(payload.Values.AlbumIDs); err != nil {
		payload.FieldErrors["album_ids"] = "Album must be a valid number."
	} else {
		payload.AlbumIDs = albumIDs
	}

	if artistIDs, err := parseIDList(payload.Values.ArtistIDs); err != nil {
		payload.FieldErrors["artist_ids"] = "Artist selection must contain numeric IDs."
	} else {
		payload.ArtistIDs = artistIDs
	}

	if writerIDs, err := parseIDList(payload.Values.WriterIDs); err != nil {
		payload.FieldErrors["writer_ids"] = "Writer selection must contain numeric IDs."
	} else {
		payload.WriterIDs = writerIDs
	}

	return payload, nil
}

func (h *Handler) fetchLookups(r *http.Request) (struct {
	artists   []components.AdminSongOption
	writers   []components.AdminSongOption
	albums    []components.AdminSongOption
	levels    []components.AdminSongOption
	languages []components.AdminSongOption
}, error) {
	ctx := r.Context()

	artistsResult, err := h.artists.List(ctx, artistsvc.ListParams{Page: 1, PerPage: 100})
	if err != nil {
		return struct {
			artists   []components.AdminSongOption
			writers   []components.AdminSongOption
			albums    []components.AdminSongOption
			levels    []components.AdminSongOption
			languages []components.AdminSongOption
		}{}, err
	}

	writersResult, err := h.writers.List(ctx, writersvc.ListParams{Page: 1, PerPage: 100})
	if err != nil {
		return struct {
			artists   []components.AdminSongOption
			writers   []components.AdminSongOption
			albums    []components.AdminSongOption
			levels    []components.AdminSongOption
			languages []components.AdminSongOption
		}{}, err
	}

	albumsResult, err := h.albums.List(ctx, albumsvc.ListParams{Page: 1, PerPage: 100})
	if err != nil {
		return struct {
			artists   []components.AdminSongOption
			writers   []components.AdminSongOption
			albums    []components.AdminSongOption
			levels    []components.AdminSongOption
			languages []components.AdminSongOption
		}{}, err
	}

	levelsResult, err := h.levels.List(ctx)
	if err != nil {
		return struct {
			artists   []components.AdminSongOption
			writers   []components.AdminSongOption
			albums    []components.AdminSongOption
			levels    []components.AdminSongOption
			languages []components.AdminSongOption
		}{}, err
	}

	lookups := struct {
		artists   []components.AdminSongOption
		writers   []components.AdminSongOption
		albums    []components.AdminSongOption
		levels    []components.AdminSongOption
		languages []components.AdminSongOption
	}{
		artists: make([]components.AdminSongOption, 0, len(artistsResult.Data)),
		writers: make([]components.AdminSongOption, 0, len(writersResult.Data)),
		albums:  make([]components.AdminSongOption, 0, len(albumsResult.Data)),
		levels:  make([]components.AdminSongOption, 0, len(levelsResult)),
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

	for _, level := range levelsResult {
		label := formatLevelLabel(level.Name)
		lookups.levels = append(lookups.levels, components.AdminSongOption{
			Value: strconv.Itoa(level.ID),
			Label: label,
		})
	}

	return lookups, nil
}

func buildValuesFromSong(song songsvc.Song) components.AdminSongFormValues {
	values := components.AdminSongFormValues{
		Title:       song.Title,
		LevelID:     "",
		Key:         "",
		LanguageID:  "",
		ReleaseYear: "",
		AlbumIDs:    toStringIDsFromAlbums(song.Albums),
		ArtistIDs:   toStringIDsFromPeople(song.Artists),
		WriterIDs:   toStringIDsFromPeople(song.Writers),
		Lyric:       "",
	}
	if song.Language.ID != 0 {
		values.LanguageID = strconv.Itoa(song.Language.ID)
	}
	if song.Level != nil {
		values.LevelID = strconv.Itoa(song.Level.ID)
	}
	if song.Key != nil {
		values.Key = strings.TrimSpace(*song.Key)
	}
	if song.ReleaseYear != nil {
		values.ReleaseYear = strconv.Itoa(*song.ReleaseYear)
	}
	if song.Lyric != nil {
		values.Lyric = *song.Lyric
	}

	return values
}

func defaultSongValues() components.AdminSongFormValues {
	return components.AdminSongFormValues{
		AlbumIDs:  []string{},
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

func formatLevelLabel(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	return strings.ToUpper(lower[:1]) + lower[1:]
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

func joinNames(people []songsvc.Person) string {
	if len(people) == 0 {
		return "—"
	}

	names := make([]string, 0, len(people))
	for _, person := range people {
		name := strings.TrimSpace(person.Name)
		if name == "" {
			continue
		}
		names = append(names, name)
	}

	if len(names) == 0 {
		return "—"
	}

	return strings.Join(names, ", ")
}

func toStringIDsFromPeople(people []songsvc.Person) []string {
	if len(people) == 0 {
		return []string{}
	}
	ids := make([]string, 0, len(people))
	for _, person := range people {
		ids = append(ids, strconv.Itoa(person.ID))
	}
	return ids
}

func toStringIDsFromAlbums(albums []songsvc.Album) []string {
	if len(albums) == 0 {
		return []string{}
	}
	ids := make([]string, 0, len(albums))
	for _, album := range albums {
		ids = append(ids, strconv.Itoa(album.ID))
	}
	return ids
}

func levelNameOrDash(level *songsvc.Level) string {
	if level == nil {
		return "—"
	}
	name := strings.TrimSpace(level.Name)
	if name == "" {
		return "—"
	}
	return formatLevelLabel(name)
}

func pointerToHuman(value *string) string {
	if value == nil {
		return "—"
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return "—"
	}
	lower := strings.ToLower(trimmed)
	return strings.ToUpper(lower[:1]) + lower[1:]
}

func releaseYearOrDash(value *int) string {
	if value == nil || *value <= 0 {
		return "—"
	}
	return strconv.Itoa(*value)
}
