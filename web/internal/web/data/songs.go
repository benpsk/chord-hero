package data

type Song struct {
	ID       string
	Title    string
	Artist   string
	Composer string
	Level    string
	Key      string
	Language FilterLanguage
	Body     string
}

var Songs = []Song{
	{
		ID:       "amazing-grace",
		Title:    "Amazing Grace",
		Artist:   "Traditional",
		Composer: "Graham, Billie",
		Level:    "Easy",
		Key:      "G",
		Language: "English",
		Body: `Key:[G]
Intro: [A] [G] [C] [A] [D]
||
Verse 1
[C]Amazing [G]grace, how [C]sweet the [G]sound
That [G]saved a [C]wretch like [D]me
[G]I once was [C]lost, but [G]now am [C]found
Was [G]blind, but [D]now I [G]see
Verse 2
[C]Amazing [G]grace, how [C]sweet the [G]sound
That [G]saved a [C]wretch like [D]me
[G]I once was [C]lost, but [G]now am [C]found
Was [G]blind, but [D]now I [G]see 
Verse 3
[C]Amazing [G]grace, how [C]sweet the [G]sound
That [G]saved a [C]wretch like [D]me
[G]I once was [C]lost, but [G]now am [C]found
Was [G]blind, but [D]now I [G]see 
Verse 4
[C]Amazing [G]grace, how [C]sweet the [G]sound
That [G]saved a [C]wretch like [D]me
[G]I once was [C]lost, but [G]now am [C]found
Was [G]blind, but [D]now I [G]see 
Verse 4
[C]Amazing [G]grace, how [C]sweet the [G]sound
That [G]saved a [C]wretch like [D]me
[G]I once was [C]lost, but [G]now am [C]found
Was [G]blind, but [D]now I [G]see`,
	},
	{
		ID:       "auld-lang-syne",
		Title:    "Auld Lang Syne",
		Artist:   "Traditional",
		Composer: "Nightingle",
		Level:    "Medium",
		Key:      "G",
		Language: "English",
		Body: `Key:[A]
 Intro: [A] [G] [C] [A] [D]

||
Verse 2
 [G]Should auld ac[D]quaintance be [G]forgot,
And [C]never [D]brought to [G]mind?
[G]Should auld ac[D]quaintance be [G]forgot,
And [C]days of [D]auld lang [G]syne.

[G]For auld lang [C]syne, my [G]dear,
For [C]auld lang [D]syne,
[G]We'll tak a [D]cup o' [G]kindness yet,
For [C]auld [D]lang [G]syne.`,
	},
	{
		ID:       "greensleeves",
		Title:    "Greensleeves",
		Artist:   "Traditional",
		Composer: "Green Slaver",
		Level:    "Medium",
		Key:      "Em",
		Language: "English",
		Body: `Key:[D]
 Intro: [A ][G ][C ][A ][D]

||
Cho
[Em]Alas, my [D]love, you [G]do me [B7]wrong
To [Em]cast me [D]off dis[G]courteously [B7]
[Em]For I have [D]loved you [G]well and [B7]long
De[Em]lighting [D]in your [G]compa[B7]ny

[Em]Greensleeves was [G]all my joy
[D]Greensleeves was my [B7]delight
[Em]Greensleeves was my [G]heart of gold
[D]And who but my [B7]lady [Em]Greensleeves`,
	},
}

func GetSongByID(id string) (Song, bool) {
	for _, song := range Songs {
		if song.ID == id {
			return song, true
		}
	}
	return Song{}, false
}
