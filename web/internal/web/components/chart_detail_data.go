package components

import "github.com/lyricapp/lyric/web/internal/web/data"

// ChartLanguageOption describes a language filter toggle option on the chart detail view.
type ChartLanguageOption struct {
	Label    string
	Value    data.FilterLanguage
	Selected bool
}

// ChartDetailProps contains all data required to render the chart detail page.
type ChartDetailProps struct {
	Detail              data.ChartDetail
	Tracks              []data.ChartTrack
	LanguageOptions     []ChartLanguageOption
	SelectedLanguages   []data.FilterLanguage
	ShowingAllLanguages bool
}
