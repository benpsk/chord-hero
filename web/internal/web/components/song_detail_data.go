package components

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/lyricapp/lyric/web/internal/web/data"
)

type SongDetailMode string

const (
	SongModeOverlay SongDetailMode = "overlay"
	SongModeInline  SongDetailMode = "inline"
	SongModeLyric   SongDetailMode = "lyric"

	songMinTranspose = -11
	songMaxTranspose = 11
	songMinOverGap   = -8
	songMaxOverGap   = 16
	songMinLineGap   = -8
	songMaxLineGap   = 24
	songMinColumns   = 1
	songMaxColumns   = 2
)

// SongModeOption represents a selectable chord display mode toggle.
type SongModeOption struct {
	Label  string
	Mode   SongDetailMode
	Active bool
	URL    string
}

// SongColumnOption represents a selectable layout column count.
type SongColumnOption struct {
	Label   string
	Columns int
	Active  bool
	URL     string
}

// SongLineKind differentiates between spacer rows, section headers, and chord content.
type SongLineKind string

const (
	SongLineKindEmpty   SongLineKind = "empty"
	SongLineKindSection SongLineKind = "section"
	SongLineKindContent SongLineKind = "content"
)

// SongOverlayLine captures a prepared overlay row.
type SongOverlayLine struct {
	Kind      SongLineKind
	ChordLine string
	Lyric     string
}

// SongInlineSegment is rendered sequentially, alternating between chords and lyrics.
type SongInlineSegment struct {
	IsChord bool
	Text    string
}

// SongInlineLine represents a line in inline mode.
type SongInlineLine struct {
	Kind     SongLineKind
	Segments []SongInlineSegment
	Raw      string
}

// SongLyricLine contains plain lyric content without chord annotations.
type SongLyricLine struct {
	Kind SongLineKind
	Text string
}

// SongDetailProps supplies the song detail template with parsed data and controls.
type SongDetailProps struct {
	Song          data.Song
	Mode          SongDetailMode
	ModeOptions   []SongModeOption
	Columns       int
	ColumnOptions []SongColumnOption

	Prelude []string

	Overlay []SongOverlayLine
	Inline  []SongInlineLine
	Lyrics  []SongLyricLine

	Transpose         int
	MinTranspose      int
	MaxTranspose      int
	TransposeDisplay  string
	TransposeDownURL  string
	TransposeUpURL    string
	TransposeResetURL string
	CanTransposeDown  bool
	CanTransposeUp    bool
	TransposeDownAria string
	TransposeUpAria   string
	TransposeDownTab  string
	TransposeUpTab    string

	BaseKey      string
	EffectiveKey string
	HasKey       bool
	KeyDisplay   string

	OverGap            int
	OverGapDisplay     string
	OverGapDownURL     string
	OverGapUpURL       string
	OverGapResetURL    string
	CanDecreaseOverGap bool
	CanIncreaseOverGap bool

	LineGap            int
	LineGapDisplay     string
	LineGapDownURL     string
	LineGapUpURL       string
	LineGapResetURL    string
	CanDecreaseLineGap bool
	CanIncreaseLineGap bool

	ShowOverGapControls bool
	ShowLineGapControls bool
}

var (
	chordTokenPattern   = regexp.MustCompile(`\[[^\]]+\]`)
	chordRootPattern    = regexp.MustCompile(`^([A-G])([b#]?)(.*)$`)
	keyDirectivePattern = regexp.MustCompile(`(?i)\{?\s*key\s*:\s*([^}\n]+)\}?`)
)

var (
	sharps      = []string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}
	flats       = []string{"C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"}
	noteToIndex map[string]int
)

func init() {
	noteToIndex = make(map[string]int, len(sharps)*2)
	for i, note := range sharps {
		noteToIndex[note] = i
	}
	for i, note := range flats {
		noteToIndex[note] = i
	}
}

// BuildSongDetailProps prepares the view model for rendering a song detail page.
func BuildSongDetailProps(song data.Song, mode SongDetailMode, transpose, overGap, lineGap, columns int) SongDetailProps {
	normalizedMode := normalizeSongMode(mode)
	clampedTranspose := clampTranspose(transpose)
	clampedOverGap := clampOverGap(overGap)
	clampedLineGap := clampLineGap(lineGap)
	clampedColumns := clampColumns(columns)

	transposedBody := transposeChordPro(song.Body, clampedTranspose)
	prelude, parsed := parseSongBody(transposedBody)

	baseKey := firstNonEmpty(normalizeKeyValue(song.Key), extractKeyFromBody(song.Body))
	effectiveKey := ""
	if baseKey != "" {
		effectiveKey = transposeChordToken(baseKey, clampedTranspose)
	}

	props := SongDetailProps{
		Song:          song,
		Mode:          normalizedMode,
		ModeOptions:   buildModeOptions(song.ID, normalizedMode, clampedTranspose, clampedOverGap, clampedLineGap, clampedColumns),
		Columns:       clampedColumns,
		ColumnOptions: buildColumnOptions(song.ID, normalizedMode, clampedTranspose, clampedOverGap, clampedLineGap, clampedColumns),
		Prelude:       prelude,
		Overlay:       buildOverlayLines(parsed),
		Inline:        buildInlineLines(parsed),
		Lyrics:        buildLyricLines(parsed),

		Transpose:         clampedTranspose,
		MinTranspose:      songMinTranspose,
		MaxTranspose:      songMaxTranspose,
		TransposeDisplay:  formatSigned(clampedTranspose),
		TransposeDownURL:  songDetailURL(song.ID, normalizedMode, clampedTranspose-1, clampedOverGap, clampedLineGap, clampedColumns),
		TransposeUpURL:    songDetailURL(song.ID, normalizedMode, clampedTranspose+1, clampedOverGap, clampedLineGap, clampedColumns),
		TransposeResetURL: songDetailURL(song.ID, normalizedMode, 0, clampedOverGap, clampedLineGap, clampedColumns),
		CanTransposeDown:  clampedTranspose > songMinTranspose,
		CanTransposeUp:    clampedTranspose < songMaxTranspose,
		BaseKey:           baseKey,
		EffectiveKey:      effectiveKey,
		HasKey:            strings.TrimSpace(baseKey) != "",

		OverGap:            clampedOverGap,
		OverGapDisplay:     formatPixels(clampedOverGap),
		OverGapDownURL:     songDetailURL(song.ID, normalizedMode, clampedTranspose, clampedOverGap-2, clampedLineGap, clampedColumns),
		OverGapUpURL:       songDetailURL(song.ID, normalizedMode, clampedTranspose, clampedOverGap+2, clampedLineGap, clampedColumns),
		OverGapResetURL:    songDetailURL(song.ID, normalizedMode, clampedTranspose, 2, clampedLineGap, clampedColumns),
		CanDecreaseOverGap: clampedOverGap > songMinOverGap,
		CanIncreaseOverGap: clampedOverGap < songMaxOverGap,

		LineGap:            clampedLineGap,
		LineGapDisplay:     formatPixels(clampedLineGap),
		LineGapDownURL:     songDetailURL(song.ID, normalizedMode, clampedTranspose, clampedOverGap, clampedLineGap-2, clampedColumns),
		LineGapUpURL:       songDetailURL(song.ID, normalizedMode, clampedTranspose, clampedOverGap, clampedLineGap+2, clampedColumns),
		LineGapResetURL:    songDetailURL(song.ID, normalizedMode, clampedTranspose, clampedOverGap, 0, clampedColumns),
		CanDecreaseLineGap: clampedLineGap > songMinLineGap,
		CanIncreaseLineGap: clampedLineGap < songMaxLineGap,

		ShowOverGapControls: true,
		ShowLineGapControls: normalizedMode == SongModeInline,
	}

	props.TransposeDownAria = boolToAria(!props.CanTransposeDown)
	props.TransposeUpAria = boolToAria(!props.CanTransposeUp)
	props.TransposeDownTab = tabIndex(props.CanTransposeDown)
	props.TransposeUpTab = tabIndex(props.CanTransposeUp)

	if props.HasKey {
		if clampedTranspose != 0 && effectiveKey != "" && effectiveKey != baseKey {
			props.KeyDisplay = fmt.Sprintf("Key: %s → %s", baseKey, effectiveKey)
		} else {
			props.KeyDisplay = fmt.Sprintf("Key: %s", baseKey)
		}
	} else {
		props.KeyDisplay = "Key: —"
	}

	return props
}

func buildModeOptions(songID string, active SongDetailMode, transpose, overGap, lineGap, columns int) []SongModeOption {
	return []SongModeOption{
		modeOption("Overlay", SongModeOverlay, active, songID, transpose, overGap, lineGap, columns),
		modeOption("Inline", SongModeInline, active, songID, transpose, overGap, lineGap, columns),
		modeOption("Lyric", SongModeLyric, active, songID, transpose, overGap, lineGap, columns),
	}
}

func normalizeSongMode(mode SongDetailMode) SongDetailMode {
	switch mode {
	case SongModeInline:
		return SongModeInline
	case SongModeLyric:
		return SongModeLyric
	default:
		return SongModeOverlay
	}
}

func buildColumnOptions(songID string, mode SongDetailMode, transpose, overGap, lineGap, columns int) []SongColumnOption {
	opts := []SongColumnOption{
		{Label: "1 column", Columns: 1},
		{Label: "2 columns", Columns: 2},
	}
	for i := range opts {
		opts[i].Active = opts[i].Columns == columns
		opts[i].URL = songDetailURL(songID, mode, transpose, overGap, lineGap, opts[i].Columns)
	}
	return opts
}

func modeOption(label string, value SongDetailMode, active SongDetailMode, songID string, transpose, overGap, lineGap, columns int) SongModeOption {
	return SongModeOption{
		Label:  label,
		Mode:   value,
		Active: value == active,
		URL:    songDetailURL(songID, value, transpose, overGap, lineGap, columns),
	}
}

func songDetailURL(songID string, mode SongDetailMode, transpose, overGap, lineGap, columns int) string {
	base := fmt.Sprintf("/songs/%s", songID)
	params := url.Values{}
	if mode != SongModeOverlay {
		params.Set("view", string(mode))
	}
	if transpose != 0 {
		params.Set("transpose", fmt.Sprintf("%d", clampTranspose(transpose)))
	}
	if overGap != 2 {
		params.Set("gap", fmt.Sprintf("%d", clampOverGap(overGap)))
	}
	if lineGap != 0 {
		params.Set("lineGap", fmt.Sprintf("%d", clampLineGap(lineGap)))
	}
	if columns != 1 {
		params.Set("columns", fmt.Sprintf("%d", clampColumns(columns)))
	}
	if len(params) == 0 {
		return base
	}
	return base + "?" + params.Encode()
}

func clampTranspose(value int) int {
	if value < songMinTranspose {
		return songMinTranspose
	}
	if value > songMaxTranspose {
		return songMaxTranspose
	}
	return value
}

func clampOverGap(value int) int {
	if value < songMinOverGap {
		return songMinOverGap
	}
	if value > songMaxOverGap {
		return songMaxOverGap
	}
	return value
}

func clampLineGap(value int) int {
	if value < songMinLineGap {
		return songMinLineGap
	}
	if value > songMaxLineGap {
		return songMaxLineGap
	}
	return value
}

func clampColumns(value int) int {
	if value < songMinColumns {
		return songMinColumns
	}
	if value > songMaxColumns {
		return songMaxColumns
	}
	return value
}

type parsedSongLine struct {
	raw        string
	trimmed    string
	kind       SongLineKind
	modeActive bool
	chordLine  string
	lyric      string
	inlineSegs []SongInlineSegment
	lyricOnly  string
}

func parseSongBody(body string) ([]string, []parsedSongLine) {
	lines := strings.Split(body, "\n")
	parsed := make([]parsedSongLine, 0, len(lines))
	prelude := make([]string, 0)
	modeActive := false

	for _, rawLine := range lines {
		line := strings.TrimRight(rawLine, "\r")
		trimmed := strings.TrimSpace(line)
		if trimmed == "||" {
			modeActive = true
			continue
		}

		parsedLine := parsedSongLine{
			raw:        line,
			trimmed:    trimmed,
			modeActive: modeActive,
		}

		switch {
		case trimmed == "":
			parsedLine.kind = SongLineKindEmpty
			parsedLine.lyricOnly = ""
		case !strings.Contains(line, "["):
			parsedLine.kind = SongLineKindSection
			parsedLine.lyric = line
			parsedLine.inlineSegs = []SongInlineSegment{{IsChord: false, Text: line}}
			parsedLine.lyricOnly = line
		default:
			parsedLine.kind = SongLineKindContent
			lyric, chordPositions := parseInline(line)
			parsedLine.lyric = lyric
			parsedLine.lyricOnly = lyric
			parsedLine.chordLine = buildChordLine(lyric, chordPositions)
			parsedLine.inlineSegs = buildInlineSegments(line)
		}

		parsed = append(parsed, parsedLine)
		if !modeActive {
			prelude = append(prelude, line)
		}
	}

	return prelude, parsed
}

type chordPosition struct {
	name string
	pos  int
}

func parseInline(line string) (string, []chordPosition) {
	var lyric strings.Builder
	positions := make([]chordPosition, 0)
	matches := chordTokenPattern.FindAllStringIndex(line, -1)
	last := 0
	for _, match := range matches {
		start, end := match[0], match[1]
		lyric.WriteString(line[last:start])
		chord := line[start+1 : end-1]
		positions = append(positions, chordPosition{name: chord, pos: lyric.Len()})
		last = end
	}
	lyric.WriteString(line[last:])
	return lyric.String(), positions
}

func buildChordLine(lyric string, chords []chordPosition) string {
	if len(chords) == 0 {
		return ""
	}
	var builder strings.Builder
	for _, chord := range chords {
		if chord.pos < 0 {
			continue
		}
		if builder.Len() < chord.pos {
			builder.WriteString(strings.Repeat(" ", chord.pos-builder.Len()))
		}
		builder.WriteString(chord.name)
	}
	return builder.String()
}

func buildInlineSegments(line string) []SongInlineSegment {
	segments := make([]SongInlineSegment, 0)
	indexes := chordTokenPattern.FindAllStringIndex(line, -1)
	last := 0
	for _, idx := range indexes {
		start, end := idx[0], idx[1]
		if start > last {
			segments = append(segments, SongInlineSegment{IsChord: false, Text: line[last:start]})
		}
		chord := line[start+1 : end-1]
		segments = append(segments, SongInlineSegment{IsChord: true, Text: chord})
		last = end
	}
	if last < len(line) {
		segments = append(segments, SongInlineSegment{IsChord: false, Text: line[last:]})
	}
	if len(segments) == 0 {
		segments = append(segments, SongInlineSegment{IsChord: false, Text: line})
	}
	return segments
}

func buildOverlayLines(parsed []parsedSongLine) []SongOverlayLine {
	lines := make([]SongOverlayLine, 0)
	for _, line := range parsed {
		if !line.modeActive {
			continue
		}
		switch line.kind {
		case SongLineKindEmpty:
			lines = append(lines, SongOverlayLine{Kind: SongLineKindEmpty})
		case SongLineKindSection:
			lines = append(lines, SongOverlayLine{Kind: SongLineKindSection, Lyric: line.raw})
		default:
			lines = append(lines, SongOverlayLine{
				Kind:      SongLineKindContent,
				ChordLine: line.chordLine,
				Lyric:     line.lyric,
			})
		}
	}
	return lines
}

func buildInlineLines(parsed []parsedSongLine) []SongInlineLine {
	lines := make([]SongInlineLine, 0)
	for _, line := range parsed {
		if !line.modeActive {
			continue
		}
		var segs []SongInlineSegment
		if len(line.inlineSegs) > 0 {
			segs = append([]SongInlineSegment(nil), line.inlineSegs...)
		}
		lines = append(lines, SongInlineLine{
			Kind:     line.kind,
			Segments: segs,
			Raw:      line.raw,
		})
	}
	return lines
}

func buildLyricLines(parsed []parsedSongLine) []SongLyricLine {
	lines := make([]SongLyricLine, 0)
	for _, line := range parsed {
		if !line.modeActive {
			continue
		}
		switch line.kind {
		case SongLineKindEmpty:
			lines = append(lines, SongLyricLine{Kind: SongLineKindEmpty, Text: ""})
		case SongLineKindSection:
			lines = append(lines, SongLyricLine{Kind: SongLineKindSection, Text: line.raw})
		default:
			lines = append(lines, SongLyricLine{Kind: SongLineKindContent, Text: line.lyricOnly})
		}
	}
	return lines
}

func transposeChordPro(text string, steps int) string {
	if steps == 0 {
		return text
	}
	steps = steps % len(sharps)
	if steps == 0 {
		return text
	}
	return chordTokenPattern.ReplaceAllStringFunc(text, func(match string) string {
		chord := match[1 : len(match)-1]
		return "[" + transposeChordToken(chord, steps) + "]"
	})
}

func transposeChordToken(token string, steps int) string {
	if steps == 0 {
		return token
	}
	parts := strings.Split(token, "/")
	primary := parts[0]
	var bass string
	if len(parts) > 1 {
		bass = parts[1]
	}

	matches := chordRootPattern.FindStringSubmatch(primary)
	if matches == nil {
		return token
	}
	root := matches[1] + matches[2]
	rest := matches[3]
	transposedRoot := transposeNote(root, steps)
	transposedBass := ""
	if bass != "" {
		transposedBass = transposeNote(bass, steps)
	}

	if transposedBass != "" {
		return transposedRoot + rest + "/" + transposedBass
	}
	return transposedRoot + rest
}

func transposeNote(note string, steps int) string {
	normalized := normalizeNote(note)
	idx, ok := noteToIndex[normalized]
	if !ok {
		return note
	}
	shifted := (idx + steps) % len(sharps)
	if shifted < 0 {
		shifted += len(sharps)
	}
	return sharps[shifted]
}

func normalizeNote(note string) string {
	cleaned := strings.TrimSpace(note)
	if cleaned == "" {
		return cleaned
	}
	if len(cleaned) == 1 {
		return strings.ToUpper(cleaned)
	}
	leading := strings.ToUpper(cleaned[:1])
	rest := cleaned[1:]
	if len(rest) > 0 {
		switch rest[0] {
		case 'b', 'B':
			rest = "b" + rest[1:]
		case '#':
			rest = "#" + rest[1:]
		}
	}
	candidate := leading + rest
	if idx, ok := noteToIndex[candidate]; ok {
		return sharps[idx]
	}
	if idx, ok := noteToIndex[strings.ToUpper(candidate)]; ok {
		return sharps[idx]
	}
	return candidate
}

func normalizeKeyValue(value string) string {
	cleaned := strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(value, "[", ""), "]", ""))
	if cleaned == "" {
		return ""
	}
	fields := strings.Fields(cleaned)
	if len(fields) == 0 {
		return ""
	}
	return strings.TrimSpace(fields[0])
}

func extractKeyFromBody(body string) string {
	if body == "" {
		return ""
	}
	matches := keyDirectivePattern.FindStringSubmatch(body)
	if len(matches) >= 2 {
		return normalizeKeyValue(matches[1])
	}
	return ""
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func formatSigned(value int) string {
	if value >= 0 {
		return fmt.Sprintf("+%d", value)
	}
	return fmt.Sprintf("%d", value)
}

func formatPixels(value int) string {
	return fmt.Sprintf("%dpx", value)
}

func boolToAria(disabled bool) string {
	if disabled {
		return "true"
	}
	return "false"
}

func tabIndex(enabled bool) string {
	if enabled {
		return "0"
	}
	return "-1"
}
