package components

import (
	"encoding/json"
	"log"
	"sort"
	"strings"

	"github.com/lyricapp/lyric/web/internal/web/data"
)

// LibrarySong describes a selectable song option for library creation.
type LibrarySong struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

// LibraryProps contains the data required to render the library page.
type LibraryProps struct {
	Songs        []LibrarySong
	SongsPayload string
}

// BuildLibraryProps assembles a sorted list of songs and a JSON payload for client-side interactions.
func BuildLibraryProps() LibraryProps {
	songs := make([]LibrarySong, 0, len(data.Songs))
	for _, song := range data.Songs {
		songs = append(songs, LibrarySong{
			ID:     song.ID,
			Title:  strings.TrimSpace(song.Title),
			Artist: strings.TrimSpace(song.Artist),
		})
	}

	sort.SliceStable(songs, func(i, j int) bool {
		return strings.ToLower(songs[i].Title) < strings.ToLower(songs[j].Title)
	})

	payloadBytes, err := json.Marshal(struct {
		Songs []LibrarySong `json:"songs"`
	}{Songs: songs})
	if err != nil {
		log.Panicf("failed to marshal library songs payload: %v", err)
	}

	return LibraryProps{
		Songs:        songs,
		SongsPayload: string(payloadBytes),
	}
}
