package search

import (
	"net/http"
	"strings"

	"github.com/a-h/templ"

	"github.com/lyricapp/lyric/web/internal/web/components"
	"github.com/lyricapp/lyric/web/internal/web/data"
)

// Handler renders the search surface using templ components.
type Handler struct{}

// New constructs a handler backed by the search component.
func New() *Handler {
	return &Handler{}
}

// ServeHTTP delegates rendering to templ's HTTP bridge.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	queryValues := r.URL.Query()
	query := strings.TrimSpace(queryValues.Get("query"))
	activeTab := components.ParseSearchTab(queryValues.Get("tab"))
	selectedLanguages := components.NormalizeSearchLanguages(queryValues["language"])

	tracks := filterTracks(query, selectedLanguages)
	albums := filterAlbums(query)
	artists := filterArtists(query)

	props := components.BuildSearchProps(query, activeTab, selectedLanguages, tracks, albums, artists)
	props.ClearQueryURL = components.SearchURL(activeTab, "", selectedLanguages)
	props.ClearLanguagesURL = components.SearchURL(activeTab, query, nil)
	props.ResetURL = "/search"

	templ.Handler(components.Search(props)).ServeHTTP(w, r)
}

func filterTracks(query string, languages []data.FilterLanguage) []data.SearchTrack {
	normalized := strings.ToLower(strings.TrimSpace(query))
	languageSet := make(map[data.FilterLanguage]struct{}, len(languages))
	for _, lang := range languages {
		languageSet[lang] = struct{}{}
	}

	results := make([]data.SearchTrack, 0, len(data.SearchTracks))
	for _, track := range data.SearchTracks {
		if !matchesTrackQuery(track, normalized) {
			continue
		}
		if !matchesTrackLanguage(track, languageSet) {
			continue
		}
		results = append(results, track)
	}
	return results
}

func matchesTrackQuery(track data.SearchTrack, normalizedQuery string) bool {
	if normalizedQuery == "" {
		return true
	}
	if strings.Contains(strings.ToLower(track.Title), normalizedQuery) {
		return true
	}
	if strings.Contains(strings.ToLower(track.Artist), normalizedQuery) {
		return true
	}
	if track.Composer != "" && strings.Contains(strings.ToLower(track.Composer), normalizedQuery) {
		return true
	}
	if track.Level != "" && strings.Contains(strings.ToLower(track.Level), normalizedQuery) {
		return true
	}
	return false
}

func matchesTrackLanguage(track data.SearchTrack, selected map[data.FilterLanguage]struct{}) bool {
	if len(selected) == 0 {
		return true
	}
	if strings.TrimSpace(track.Language) == "" {
		return true
	}
	_, ok := selected[data.FilterLanguage(track.Language)]
	return ok
}

func filterAlbums(query string) []data.SearchAlbum {
	normalized := strings.ToLower(strings.TrimSpace(query))
	if normalized == "" {
		return append([]data.SearchAlbum(nil), data.SearchAlbums...)
	}
	results := make([]data.SearchAlbum, 0, len(data.SearchAlbums))
	for _, album := range data.SearchAlbums {
		if strings.Contains(strings.ToLower(album.Title), normalized) || strings.Contains(strings.ToLower(album.Artist), normalized) {
			results = append(results, album)
		}
	}
	return results
}

func filterArtists(query string) []data.SearchArtist {
	normalized := strings.ToLower(strings.TrimSpace(query))
	if normalized == "" {
		return append([]data.SearchArtist(nil), data.SearchArtists...)
	}
	results := make([]data.SearchArtist, 0, len(data.SearchArtists))
	for _, artist := range data.SearchArtists {
		if strings.Contains(strings.ToLower(artist.Name), normalized) {
			results = append(results, artist)
		}
	}
	return results
}
