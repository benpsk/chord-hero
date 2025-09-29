package charts

import (
	"net/http"
	"strings"

	"github.com/a-h/templ"
	"github.com/go-chi/chi/v5"

	"github.com/lyricapp/lyric/web/internal/web/components"
	"github.com/lyricapp/lyric/web/internal/web/data"
)

// Handler renders chart detail pages based on a chart identifier path parameter.
type Handler struct{}

// New constructs a chart detail handler instance.
func New() *Handler {
	return &Handler{}
}

// ServeHTTP resolves the chart identifier, builds the view model, and renders the template.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	chartID := chi.URLParam(r, "id")
	if chartID == "" {
		http.NotFound(w, r)
		return
	}

	detail, ok := data.HomeDetails[chartID]
	if !ok {
		http.NotFound(w, r)
		return
	}

	selected, showAll := selectedLanguagesFromRequest(r)
	languageOptions := buildLanguageOptions(selected, showAll)
	tracks := filterTracks(detail.Tracks, selected, showAll)

	props := components.ChartDetailProps{
		Detail:              detail,
		Tracks:              tracks,
		LanguageOptions:     languageOptions,
		SelectedLanguages:   selected,
		ShowingAllLanguages: showAll,
	}

	templ.Handler(components.ChartDetail(props)).ServeHTTP(w, r)
}

func selectedLanguagesFromRequest(r *http.Request) ([]data.FilterLanguage, bool) {
	query := r.URL.Query()
	if strings.EqualFold(query.Get("all"), "1") {
		return nil, true
	}

	received := query["language"]
	if len(received) == 0 {
		return []data.FilterLanguage{data.FilterLanguages[0]}, false
	}

	selected := make([]data.FilterLanguage, 0, len(received))
	seen := make(map[data.FilterLanguage]struct{}, len(received))
	for _, raw := range received {
		lang := data.FilterLanguage(raw)
		if !isValidLanguage(lang) {
			continue
		}
		if _, exists := seen[lang]; exists {
			continue
		}
		seen[lang] = struct{}{}
		selected = append(selected, lang)
	}

	if len(selected) == 0 {
		return []data.FilterLanguage{data.FilterLanguages[0]}, false
	}

	return selected, false
}

func buildLanguageOptions(selected []data.FilterLanguage, showAll bool) []components.ChartLanguageOption {
	selectedSet := make(map[data.FilterLanguage]struct{}, len(selected))
	for _, lang := range selected {
		selectedSet[lang] = struct{}{}
	}

	opts := make([]components.ChartLanguageOption, 0, len(data.FilterLanguages))
	for _, lang := range data.FilterLanguages {
		opts = append(opts, components.ChartLanguageOption{
			Label:    string(lang),
			Value:    lang,
			Selected: !showAll && contains(selectedSet, lang),
		})
	}

	return opts
}

func filterTracks(tracks []data.ChartTrack, selected []data.FilterLanguage, showAll bool) []data.ChartTrack {
	if showAll || len(selected) == 0 {
		return tracks
	}

	selectedSet := make(map[data.FilterLanguage]struct{}, len(selected))
	for _, lang := range selected {
		selectedSet[lang] = struct{}{}
	}

	filtered := make([]data.ChartTrack, 0, len(tracks))
	for _, track := range tracks {
		if track.Language == "" {
			filtered = append(filtered, track)
			continue
		}
		if _, ok := selectedSet[track.Language]; ok {
			filtered = append(filtered, track)
		}
	}

	return filtered
}

func contains(set map[data.FilterLanguage]struct{}, value data.FilterLanguage) bool {
	_, ok := set[value]
	return ok
}

func isValidLanguage(lang data.FilterLanguage) bool {
	for _, candidate := range data.FilterLanguages {
		if candidate == lang {
			return true
		}
	}
	return false
}
