package components

// AdminSongCreateProps collects data rendered by the admin song create template.
type AdminSongCreateProps struct {
	Values      AdminSongFormValues
	Errors      []string
	FieldErrors map[string]string
	Success     bool
	Artists     []AdminSongOption
	Writers     []AdminSongOption
	Albums      []AdminSongOption
	Levels      []AdminSongOption
	Languages   []AdminSongOption
	CurrentUser string
}

// AdminSongFormValues captures submitted form values for re-rendering the page.
type AdminSongFormValues struct {
	Title           string
	Level           string
	Key             string
	Language        string
	ReleaseYear     string
	AlbumIDs         []string
	PrimaryWriterID string
	ArtistIDs       []string
	WriterIDs       []string
	Lyric           string
}

// AdminSongOption represents a selectable option in the admin form.
type AdminSongOption struct {
	Value    string
	Label    string
	Selected bool
}
