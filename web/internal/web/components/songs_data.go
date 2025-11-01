package components

import (
	"net/url"
	"strings"

	"github.com/lyricapp/lyric/web/internal/web/data"
)

// SongsTab enumerates the available song result groupings.
type SongsTab string

const (
	SongsTabTracks  SongsTab = "tracks"
	SongsTabAlbums  SongsTab = "albums"
	SongsTabArtists SongsTab = "artists"
)

// ParseSongsTab converts a raw query parameter into a known tab value.
func ParseSongsTab(raw string) SongsTab {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(SongsTabAlbums):
		return SongsTabAlbums
	case string(SongsTabArtists):
		return SongsTabArtists
	default:
		return SongsTabTracks
	}
}

// SongsTabOption describes a selectable tab, including counts for display.
type SongsTabOption struct {
	Key    SongsTab
	Label  string
	Count  int
	Active bool
}

// SongsLanguageOption models a toggleable language filter button.
type SongsLanguageOption struct {
	Label           string
	Value           data.FilterLanguage
	Active          bool
	SubmitLanguages []data.FilterLanguage
}

// SongsProps contains the data required to render the songs page.
type SongsProps struct {
	Query             string
	ActiveTab         SongsTab
	ActiveTabLabel    string
	Tabs              []SongsTabOption
	SelectedLanguages []data.FilterLanguage
	LanguageOptions   []SongsLanguageOption
	Tracks            []data.SearchTrack
	Albums            []data.SearchAlbum
	Artists           []data.SearchArtist
	ActiveCount       int
	HasQuery          bool
	HasActiveFilters  bool
	ClearQueryURL     string
	ClearLanguagesURL string
	ResetURL          string
}

// BuildSongsProps assembles the view model for the songs template.
func BuildSongsProps(query string, activeTab SongsTab, selected []data.FilterLanguage, tracks []data.SearchTrack, albums []data.SearchAlbum, artists []data.SearchArtist) SongsProps {
	selectedSet := make(map[data.FilterLanguage]struct{}, len(selected))
	for _, lang := range selected {
		selectedSet[lang] = struct{}{}
	}

	tabs := []SongsTabOption{
		{Key: SongsTabTracks, Label: "Tracks", Count: len(tracks), Active: activeTab == SongsTabTracks},
		{Key: SongsTabAlbums, Label: "Albums", Count: len(albums), Active: activeTab == SongsTabAlbums},
		{Key: SongsTabArtists, Label: "Artists", Count: len(artists), Active: activeTab == SongsTabArtists},
	}

	var activeLabel string
	for _, tab := range tabs {
		if tab.Active {
			activeLabel = tab.Label
			break
		}
	}

	languageOptions := make([]SongsLanguageOption, 0, len(data.FilterLanguages))
	for _, lang := range data.FilterLanguages {
		_, isSelected := selectedSet[lang]
		var submit []data.FilterLanguage
		if isSelected {
			submit = languagesAfterRemoving(selectedSet, lang)
		} else {
			submit = languagesAfterAdding(selectedSet, lang)
		}
		languageOptions = append(languageOptions, SongsLanguageOption{
			Label:           string(lang),
			Value:           lang,
			Active:          isSelected,
			SubmitLanguages: submit,
		})
	}

	props := SongsProps{
		Query:             query,
		ActiveTab:         activeTab,
		ActiveTabLabel:    activeLabel,
		Tabs:              tabs,
		SelectedLanguages: orderedLanguages(selectedSet),
		LanguageOptions:   languageOptions,
		Tracks:            tracks,
		Albums:            albums,
		Artists:           artists,
		ActiveCount:       activeResultCount(activeTab, len(tracks), len(albums), len(artists)),
		HasQuery:          strings.TrimSpace(query) != "",
	}
	props.HasActiveFilters = props.HasQuery || len(props.SelectedLanguages) > 0
	return props
}

func orderedLanguages(selected map[data.FilterLanguage]struct{}) []data.FilterLanguage {
	ordered := make([]data.FilterLanguage, 0, len(selected))
	for _, lang := range data.FilterLanguages {
		if _, ok := selected[lang]; ok {
			ordered = append(ordered, lang)
		}
	}
	return ordered
}

func languagesAfterAdding(selected map[data.FilterLanguage]struct{}, target data.FilterLanguage) []data.FilterLanguage {
	result := make([]data.FilterLanguage, 0, len(selected)+1)
	for _, lang := range data.FilterLanguages {
		if lang == target {
			result = append(result, lang)
			continue
		}
		if _, ok := selected[lang]; ok {
			result = append(result, lang)
		}
	}
	return result
}

func languagesAfterRemoving(selected map[data.FilterLanguage]struct{}, target data.FilterLanguage) []data.FilterLanguage {
	result := make([]data.FilterLanguage, 0, len(selected))
	for _, lang := range data.FilterLanguages {
		if lang == target {
			continue
		}
		if _, ok := selected[lang]; ok {
			result = append(result, lang)
		}
	}
	return result
}

func activeResultCount(tab SongsTab, trackCount, albumCount, artistCount int) int {
	switch tab {
	case SongsTabAlbums:
		return albumCount
	case SongsTabArtists:
		return artistCount
	default:
		return trackCount
	}
}

// NormalizeSongsLanguages validates and orders the language filters from query values.
func NormalizeSongsLanguages(raw []string) []data.FilterLanguage {
	if len(raw) == 0 {
		return nil
	}
	set := make(map[data.FilterLanguage]struct{}, len(raw))
	for _, value := range raw {
		lang := data.FilterLanguage(strings.TrimSpace(value))
		for _, candidate := range data.FilterLanguages {
			if candidate == lang {
				set[lang] = struct{}{}
				break
			}
		}
	}
	return orderedLanguages(set)
}

func songsLanguageButtonClass(active bool) string {
	if active {
		return "badge badge-primary cursor-pointer px-4 py-3 text-sm"
	}
	return "badge badge-outline cursor-pointer px-4 py-3 text-sm"
}

func songsTabButtonClass(active bool) string {
	base := "tab tab-lifted px-4 py-2"
	if active {
		return base + " tab-active"
	}
	return base
}

func pluralSuffix(count int) string {
	if count == 1 {
		return ""
	}
	return "s"
}

// SongsURL constructs a canonical songs path with the provided parameters.
func SongsURL(tab SongsTab, query string, languages []data.FilterLanguage) string {
	params := url.Values{}
	if strings.TrimSpace(query) != "" {
		params.Set("query", query)
	}
	if tab != "" {
		params.Set("tab", string(tab))
	}
	for _, lang := range languages {
		params.Add("language", string(lang))
	}
	encoded := params.Encode()
	if encoded == "" {
		return "/songs"
	}
	return "/songs?" + encoded
}
