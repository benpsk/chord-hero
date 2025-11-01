package components

// AdminSongCreateProps collects data rendered by the admin song create template.
type AdminSongCreateProps struct {
	Values      AdminSongFormValues
	Errors      []string
	FieldErrors map[string]string
	Success     bool
	SuccessText string
	Artists     []AdminSongOption
	Writers     []AdminSongOption
	Albums      []AdminSongOption
	Levels      []AdminSongOption
	Languages   []AdminSongOption
	CurrentUser string
}

// AdminSongEditProps collects data used by the song edit template.
type AdminSongEditProps struct {
	SongID      int
	Values      AdminSongFormValues
	Errors      []string
	FieldErrors map[string]string
	Success     bool
	SuccessText string
	Artists     []AdminSongOption
	Writers     []AdminSongOption
	Albums      []AdminSongOption
	Levels      []AdminSongOption
	Languages   []AdminSongOption
	CurrentUser string
}

// AdminSongListProps contains information for the admin song index.
type AdminSongListProps struct {
	SearchTerm      string
	Total           int
	Songs           []AdminSongListItem
	CurrentUser     string
	CurrentUserRole string
	ResultsLabel    string
}

// AdminSongListItem represents a single row in the admin song list.
type AdminSongListItem struct {
	ID          int
	Title       string
	Artists     string
	Writers     string
	Level       string
	Language    string
	ReleaseYear string
}

// AdminSongFormProps drives the shared song form template.
type AdminSongFormProps struct {
	Values      AdminSongFormValues
	Errors      []string
	FieldErrors map[string]string
	Success     bool
	SuccessText string
	Artists     []AdminSongOption
	Writers     []AdminSongOption
	Albums      []AdminSongOption
	Levels      []AdminSongOption
	Languages   []AdminSongOption
	FormAction  string
	SubmitLabel string
}

// AdminSongFormValues captures submitted form values for re-rendering the page.
type AdminSongFormValues struct {
	Title           string
	LevelID         string
	Key             string
	LanguageID      string
	ReleaseYear     string
	AlbumIDs        []string
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
