package data

type HomeCard struct {
	ID       string
	Title    string
	Subtitle string
}

type HomeInsight struct {
	Label string
	Value string
	Meta  string
}

type Artist struct {
	ID   string
	Name string
	Bio  string
}

var WeeklyCharts = []HomeCard{
	{ID: "easy", Title: "Top 50", Subtitle: "Easy"},
	{ID: "medium", Title: "Top 50", Subtitle: "Medium"},
	{ID: "trending", Title: "Top 50", Subtitle: "Trending"},
	{ID: "hard", Title: "Top 50", Subtitle: "Hard"},
	{ID: "legend", Title: "Top 50", Subtitle: "Legend"},
	{ID: "fresh", Title: "Top 50", Subtitle: "Fresh"},
}

var TrendingAlbums = []HomeCard{
	{ID: "cloud", Title: "Cloud", Subtitle: "MJ"},
	{ID: "topping", Title: "Topping", Subtitle: "GNR"},
	{ID: "pulse", Title: "Pulse", Subtitle: "Travis"},
}

var WeeklyInsights = []HomeInsight{
	{Label: "Hours rehearsed", Value: "12h 45m", Meta: "+8% vs last week"},
	{Label: "Most requested key", Value: "G Major", Meta: "Worship Team"},
}

var PopularArtists = []Artist{
	{ID: "jennifer", Name: "Jennifer Wilson", Bio: "Vocal lead • Harmonies"},
	{ID: "elizabeth", Name: "Elizabeth Hall", Bio: "Choir director • Arranger"},
	{ID: "anthony", Name: "Anthony Cole", Bio: "Guitar • Layered textures"},
}
