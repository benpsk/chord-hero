package components

import (
	"net/url"
	"strings"

	"github.com/lyricapp/lyric/web/internal/web/data"
)

// SearchTab enumerates the available search result groupings.
type SearchTab string

const (
	SearchTabTracks  SearchTab = "tracks"
	SearchTabAlbums  SearchTab = "albums"
	SearchTabArtists SearchTab = "artists"
)

// ParseSearchTab converts a raw query parameter into a known tab value.
func ParseSearchTab(raw string) SearchTab {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(SearchTabAlbums):
		return SearchTabAlbums
	case string(SearchTabArtists):
		return SearchTabArtists
	default:
		return SearchTabTracks
	}
}

// SearchTabOption describes a selectable tab, including counts for display.
type SearchTabOption struct {
	Key    SearchTab
	Label  string
	Count  int
	Active bool
}

// SearchLanguageOption models a toggleable language filter button.
type SearchLanguageOption struct {
	Label           string
	Value           data.FilterLanguage
	Active          bool
	SubmitLanguages []data.FilterLanguage
}

// SearchProps contains the data required to render the search page.
type SearchProps struct {
	Query             string
	ActiveTab         SearchTab
	ActiveTabLabel    string
	Tabs              []SearchTabOption
	SelectedLanguages []data.FilterLanguage
	LanguageOptions   []SearchLanguageOption
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

// BuildSearchProps assembles the view model for the search template.
func BuildSearchProps(query string, activeTab SearchTab, selected []data.FilterLanguage, tracks []data.SearchTrack, albums []data.SearchAlbum, artists []data.SearchArtist) SearchProps {
	selectedSet := make(map[data.FilterLanguage]struct{}, len(selected))
	for _, lang := range selected {
		selectedSet[lang] = struct{}{}
	}

	tabs := []SearchTabOption{
		{Key: SearchTabTracks, Label: "Tracks", Count: len(tracks), Active: activeTab == SearchTabTracks},
		{Key: SearchTabAlbums, Label: "Albums", Count: len(albums), Active: activeTab == SearchTabAlbums},
		{Key: SearchTabArtists, Label: "Artists", Count: len(artists), Active: activeTab == SearchTabArtists},
	}

	var activeLabel string
	for _, tab := range tabs {
		if tab.Active {
			activeLabel = tab.Label
			break
		}
	}

	languageOptions := make([]SearchLanguageOption, 0, len(data.FilterLanguages))
	for _, lang := range data.FilterLanguages {
		_, isSelected := selectedSet[lang]
		var submit []data.FilterLanguage
		if isSelected {
			submit = languagesAfterRemoving(selectedSet, lang)
		} else {
			submit = languagesAfterAdding(selectedSet, lang)
		}
		languageOptions = append(languageOptions, SearchLanguageOption{
			Label:           string(lang),
			Value:           lang,
			Active:          isSelected,
			SubmitLanguages: submit,
		})
	}

	props := SearchProps{
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

func activeResultCount(tab SearchTab, trackCount, albumCount, artistCount int) int {
	switch tab {
	case SearchTabAlbums:
		return albumCount
	case SearchTabArtists:
		return artistCount
	default:
		return trackCount
	}
}

// NormalizeSearchLanguages validates and orders the language filters from query values.
func NormalizeSearchLanguages(raw []string) []data.FilterLanguage {
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

func searchLanguageButtonClass(active bool) string {
	if active {
		return "badge badge-primary cursor-pointer px-4 py-3 text-sm"
	}
	return "badge badge-outline cursor-pointer px-4 py-3 text-sm"
}

func searchTabButtonClass(active bool) string {
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

// SearchURL constructs a canonical search path with the provided parameters.
func SearchURL(tab SearchTab, query string, languages []data.FilterLanguage) string {
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
		return "/search"
	}
	return "/search?" + encoded
}
