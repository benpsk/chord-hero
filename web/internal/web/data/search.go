package data

type SearchTrack struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Artist   string `json:"artist"`
	Composer string `json:"composer,omitempty"`
	Level    string `json:"level,omitempty"`
	Key      string `json:"key,omitempty"`
	Language string `json:"language,omitempty"`
}

type SearchAlbum struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Artist     string `json:"artist"`
	TrackCount int    `json:"trackCount"`
}

type SearchArtist struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SongCount int    `json:"songCount"`
}

var FilterLanguages = []string{"English", "Burmese", "Zomi"}

var SearchTracks = []SearchTrack{
	{ID: "amazing-grace", Title: "Amazing Grace", Artist: "Traditional", Composer: "Graham, Billie", Level: "Easy", Key: "G", Language: "English"},
	{ID: "auld-lang-syne", Title: "Auld Lang Syne", Artist: "Traditional", Composer: "Nightingle", Level: "Medium", Key: "G", Language: "English"},
	{ID: "greensleeves", Title: "Greensleeves", Artist: "Traditional", Composer: "Green Slaver", Level: "Medium", Key: "Em", Language: "English"},
	{ID: "flower-1", Title: "FLOWER", Artist: "Jessica Gonzalez | Jeff Clay", Level: "Easy", Key: "G", Language: "Burmese"},
	{ID: "flower-2", Title: "FLOWER", Artist: "Jessica Gonzalez | Jeff Clay", Level: "Easy", Key: "G", Language: "English"},
	{ID: "horizon-1", Title: "HORIZON", Artist: "Reina Carter | Moe Lwin", Level: "Medium", Key: "F", Language: "English"},
	{ID: "pulse-1", Title: "PULSE", Artist: "Ngwe Tun | Alex Rivers", Level: "Trending", Key: "C", Language: "English"},
}

var SearchAlbums = []SearchAlbum{
	{ID: "album-01", Title: "Album 01", Artist: "Jessica Gonzalez", TrackCount: 12},
	{ID: "album-02", Title: "Album 02", Artist: "Jeff Clay", TrackCount: 8},
	{ID: "album-03", Title: "Album 03", Artist: "Ashley Scott", TrackCount: 14},
	{ID: "album-04", Title: "Album 04", Artist: "Reina Carter", TrackCount: 9},
}

var SearchArtists = []SearchArtist{
	{ID: "artist-01", Name: "Jessica Gonzalez", SongCount: 32},
	{ID: "artist-02", Name: "Jeff Clay", SongCount: 24},
	{ID: "artist-03", Name: "Ashley Scott", SongCount: 18},
	{ID: "artist-04", Name: "Reina Carter", SongCount: 21},
}
