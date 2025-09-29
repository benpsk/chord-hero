package components

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

var albumAccentPalette = []string{
	"from-secondary/10 to-secondary/30",
	"from-accent/10 to-accent/30",
	"from-primary/10 to-primary/30",
}

func greetingForHour(hour int) string {
	switch {
	case hour < 12:
		return "Good morning"
	case hour < 18:
		return "Good afternoon"
	default:
		return "Good evening"
	}
}

func initialsForName(name string) string {
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return ""
	}

	var initials strings.Builder
	for _, part := range fields {
		r, _ := utf8.DecodeRuneInString(part)
		if r == utf8.RuneError {
			continue
		}
		initials.WriteRune(unicode.ToUpper(r))
	}

	if initials.Len() > 2 {
		return initials.String()[:2]
	}
	return initials.String()
}

func firstTwoRunes(value string) string {
	if value == "" {
		return ""
	}
	count := 0
	var builder strings.Builder
	for _, r := range value {
		builder.WriteRune(r)
		count++
		if count == 2 {
			break
		}
	}
	return builder.String()
}

func navButtonClass(active bool) string {
	base := "btn btn-ghost btn-sm"
	if active {
		return base + " btn-active"
	}
	return base
}

func primaryButtonClass(active bool) string {
	base := "btn btn-primary btn-sm"
	if active {
		return base + " btn-active"
	}
	return base
}

func albumAccent(index int) string {
	if len(albumAccentPalette) == 0 {
		return ""
	}
	if index < 0 {
		index = 0
	}
	return albumAccentPalette[index%len(albumAccentPalette)]
}

func songModeButtonClass(active bool) string {
	base := "btn join-item btn-sm"
	if active {
		return base + " btn-primary"
	}
	return base + " btn-outline"
}

func transposeButtonClass(enabled bool) string {
	base := "btn join-item btn-sm btn-outline"
	if enabled {
		return base
	}
	return base + " btn-disabled pointer-events-none"
}
