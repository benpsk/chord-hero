package data

type FilterLanguage string

type ChartTrack struct {
	ID         string
	Title      string
	Artists    string
	Key        string
	Difficulty string
	Language   FilterLanguage
}

type ChartDetail struct {
	ID           string
	CardTitle    string
	CardSubtitle string
	Heading      string
	Description  string
	Tracks       []ChartTrack
}

type ChartCollection map[string]ChartDetail

var FilterLanguages = []FilterLanguage{"English", "Burmese", "Zomi"}

var HomeDetails = ChartCollection{
	"easy": {
		ID:           "easy",
		CardTitle:    "Top 50",
		CardSubtitle: "Easy",
		Heading:      "Top 50 – Easy",
		Description:  "Weekly chart-toppers update",
		Tracks: []ChartTrack{
			{ID: "flower-1", Title: "FLOWER", Artists: "Jessica Gonzalez | Jeff Clay", Key: "G", Difficulty: "Easy", Language: "Burmese"},
			{ID: "flower-2", Title: "FLOWER", Artists: "Jessica Gonzalez | Jeff Clay", Key: "G", Difficulty: "Easy", Language: "English"},
			{ID: "flower-3", Title: "FLOWER", Artists: "Jessica Gonzalez | Jeff Clay", Key: "G", Difficulty: "Easy", Language: "Zomi"},
			{ID: "flower-4", Title: "FLOWER", Artists: "Jessica Gonzalez | Jeff Clay", Key: "G", Difficulty: "Easy", Language: "English"},
		},
	},
	"medium": {
		ID:           "medium",
		CardTitle:    "Top 50",
		CardSubtitle: "Medium",
		Heading:      "Top 50 – Medium",
		Description:  "Weekly chart-toppers update",
		Tracks: []ChartTrack{
			{ID: "horizon-1", Title: "HORIZON", Artists: "Reina Carter | Moe Lwin", Key: "F", Difficulty: "Medium", Language: "English"},
			{ID: "horizon-2", Title: "HORIZON", Artists: "Reina Carter | Moe Lwin", Key: "F", Difficulty: "Medium", Language: "Burmese"},
			{ID: "horizon-3", Title: "HORIZON", Artists: "Reina Carter | Moe Lwin", Key: "F", Difficulty: "Medium", Language: "English"},
		},
	},
	"trending": {
		ID:           "trending",
		CardTitle:    "Top 50",
		CardSubtitle: "Trending",
		Heading:      "Top 50 – Trending",
		Description:  "Weekly chart-toppers update",
		Tracks: []ChartTrack{
			{ID: "pulse-1", Title: "PULSE", Artists: "Ngwe Tun | Alex Rivers", Key: "C", Difficulty: "Trending", Language: "English"},
			{ID: "pulse-2", Title: "PULSE", Artists: "Ngwe Tun | Alex Rivers", Key: "C", Difficulty: "Trending", Language: "Zomi"},
		},
	},
	"hard": {
		ID:           "hard",
		CardTitle:    "Top 50",
		CardSubtitle: "Hard",
		Heading:      "Top 50 – Hard",
		Description:  "Weekly chart-toppers update",
		Tracks: []ChartTrack{
			{ID: "ignite-1", Title: "IGNITE", Artists: "Ravi Kumar | Min Khant", Key: "A", Difficulty: "Hard", Language: "English"},
			{ID: "ignite-2", Title: "IGNITE", Artists: "Ravi Kumar | Min Khant", Key: "A", Difficulty: "Hard", Language: "Burmese"},
		},
	},
	"legend": {
		ID:           "legend",
		CardTitle:    "Top 50",
		CardSubtitle: "Legend",
		Heading:      "Top 50 – Legend",
		Description:  "Weekly chart-toppers update",
		Tracks: []ChartTrack{
			{ID: "legendary-1", Title: "LEGENDARY", Artists: "Su Thiri | Arthur Phyo", Key: "D", Difficulty: "Legend", Language: "English"},
			{ID: "legendary-2", Title: "LEGENDARY", Artists: "Su Thiri | Arthur Phyo", Key: "D", Difficulty: "Legend", Language: "English"},
		},
	},
	"fresh": {
		ID:           "fresh",
		CardTitle:    "Top 50",
		CardSubtitle: "Fresh",
		Heading:      "Top 50 – Fresh",
		Description:  "Weekly chart-toppers update",
		Tracks: []ChartTrack{
			{ID: "fresh-1", Title: "FRESH AIR", Artists: "Gigi Thant | Leo West", Key: "E", Difficulty: "Fresh", Language: "Burmese"},
		},
	},
	"cloud": {
		ID:           "cloud",
		CardTitle:    "Cloud",
		CardSubtitle: "MJ",
		Heading:      "Cloud – MJ",
		Description:  "Latest release from MJ",
		Tracks: []ChartTrack{
			{ID: "cloud-1", Title: "CIRRUS", Artists: "MJ", Key: "B", Difficulty: "Easy", Language: "English"},
			{ID: "cloud-2", Title: "STRATUS", Artists: "MJ", Key: "E", Difficulty: "Medium", Language: "English"},
		},
	},
	"topping": {
		ID:           "topping",
		CardTitle:    "Topping",
		CardSubtitle: "GNR",
		Heading:      "Topping – GNR",
		Description:  "Fan favourites from GNR",
		Tracks: []ChartTrack{
			{ID: "topping-1", Title: "RIPPLE", Artists: "GNR", Key: "A", Difficulty: "Medium", Language: "English"},
		},
	},
	"pulse": {
		ID:           "pulse",
		CardTitle:    "Pulse",
		CardSubtitle: "Travis",
		Heading:      "Pulse – Travis",
		Description:  "Live session highlights",
		Tracks: []ChartTrack{
			{ID: "pulse-live-1", Title: "HEARTLINE", Artists: "Travis", Key: "G", Difficulty: "Easy", Language: "English"},
		},
	},
}
