export type Song = {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  body: string; // ChordPro content
};

export const SONGS: Song[] = [
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Traditional',
    key: 'G',
    body: `# Amazing Grace\n{key:G}\n[C]Amazing [G]grace, how [C]sweet the [G]sound\nThat [G]saved a [C]wretch like [D]me\n[G]I once was [C]lost, but [G]now am [C]found\nWas [G]blind, but [D]now I [G]see`,
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    artist: 'Traditional',
    key: 'G',
    body: `# Auld Lang Syne\n{key:G}\n[G]Should auld ac[D]quaintance be [G]forgot,\nAnd [C]never [D]brought to [G]mind?\n[G]Should auld ac[D]quaintance be [G]forgot,\nAnd [C]days of [D]auld lang [G]syne.\n\n[G]For auld lang [C]syne, my [G]dear,\nFor [C]auld lang [D]syne,\n[G]We'll tak a [D]cup o' [G]kindness yet,\nFor [C]auld [D]lang [G]syne.`,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    artist: 'Traditional',
    key: 'Em',
    body: `# Greensleeves\n{key:Em}\n[Em]Alas, my [D]love, you [G]do me [B7]wrong\nTo [Em]cast me [D]off dis[G]courteously [B7]\n[Em]For I have [D]loved you [G]well and [B7]long\nDe[Em]lighting [D]in your [G]compa[B7]ny\n\n[Em]Greensleeves was [G]all my joy\n[D]Greensleeves was my [B7]delight\n[Em]Greensleeves was my [G]heart of gold\n[D]And who but my [B7]lady [Em]Greensleeves`,
  },
  {
    id: 'scarborough-fair',
    title: 'Scarborough Fair',
    artist: 'Traditional',
    key: 'Am',
    body: `# Scarborough Fair\n{key:Am}\n[Am]Are you [G]going to [Am]Scarborough [G]Fair?\n[Am]Parsley, [G]sage, rose[Am]mary and [G]thyme\n[Am]Remember [G]me to one [Am]who lives [G]there\n[Am]She once [G]was a [Am]true love [G]of [Am]mine`,
  },
  {
    id: 'house-of-the-rising-sun',
    title: 'House of the Rising Sun',
    artist: 'Traditional',
    key: 'Am',
    body: `# House of the Rising Sun\n{key:Am}\n[Am]There is a [C]house in [D]New Or[F]leans\n[Am]They call the [C]Rising [E]Sun\n[Am]And it's been the [C]ruin of [D]many a poor [F]boy\n[Am]And God, I [E7]know I'm [Am]one`,
  },
  {
    id: 'oh-my-darling-clementine',
    title: 'Oh My Darling, Clementine',
    artist: 'Traditional',
    key: 'C',
    body: `# Oh My Darling, Clementine\n{key:C}\n[C]In a [G7]cavern, [C]in a [G7]canyon\n[C]Excavating [F]for a [C]mine\n[C]Dwelt a [G7]miner, [C]forty [G7]niner\n[C]And his [G7]daughter [C]Clementine`,
  },
  {
    id: 'swing-low-sweet-chariot',
    title: 'Swing Low, Sweet Chariot',
    artist: 'Traditional',
    key: 'G',
    body: `# Swing Low, Sweet Chariot\n{key:G}\n[G]Swing low, [C]sweet chariot\n[G]Coming for to [D]carry me [G]home\n[G]Swing low, [C]sweet chariot\n[G]Coming for to [D]carry me [G]home`,
  },
  {
    id: 'michael-row-the-boat-ashore',
    title: 'Michael, Row the Boat Ashore',
    artist: 'Traditional',
    key: 'G',
    body: `# Michael, Row the Boat Ashore\n{key:G}\n[G]Michael, [C]row the boat [G]ashore, [D7]halle[G]lujah\n[G]Michael, [C]row the boat [G]ashore, [D7]halle[G]lujah\n[G]Sister, [C]help to trim the [G]sail, [D7]halle[G]lujah\n[G]Sister, [C]help to trim the [G]sail, [D7]halle[G]lujah`,
  },
  {
    id: 'shell-be-coming-round-the-mountain',
    title: "She'll Be Coming 'Round the Mountain",
    artist: 'Traditional',
    key: 'G',
    body: `# She'll Be Coming 'Round the Mountain\n{key:G}\n[G]She'll be [C]coming 'round the [G]mountain when she [D]comes\n[G]She'll be [C]coming 'round the [G]mountain when she [D]comes\n[G]She'll be [C]coming 'round the [G]mountain\nShe'll be [C]coming 'round the [G]mountain\n[G]She'll be [C]coming 'round the [G]mountain when she [D]comes`,
  },
  {
    id: 'home-on-the-range',
    title: 'Home on the Range',
    artist: 'Traditional',
    key: 'G',
    body: `# Home on the Range\n{key:G}\n[G]Oh, give me a [C]home where the [G]buffalo [D]roam\n[G]Where the [C]deer and the [G]antelope [D]play\n[G]Where seldom is [C]heard a dis[G]couraging [D]word\n[G]And the [C]skies are not [G]cloudy [D]all [G]day`,
  },
  {
    id: 'yankee-doodle',
    title: 'Yankee Doodle',
    artist: 'Traditional',
    key: 'C',
    body: `# Yankee Doodle\n{key:C}\n[C]Yankee Doodle [G7]went to town, a-[C]riding on a [G7]pony\n[C]Stuck a feather [F]in his [C]cap and called it [G7]maca[C]roni\n\n[C]Yankee Doodle, [G7]keep it up, Yankee Doodle [C]dandy\n[C]Mind the music [F]and the [C]step, and with the [G7]girls be [C]handy`,
  },
  {
    id: 'stand-by-me',
    title: 'Stand By Me',
    artist: 'Ben E. King',
    key: 'A',
    body: `{title:Stand By Me}\n{key:A}\n[A]When the [F#m]night has come\nAnd the [D]land is [E]dark\nAnd the [A]moon is the [F#m]only light we see`,
  },
  {
    id: 'demo-burmese',
    title: 'သရုပ်ပြ ပုံစံ (Demo)',
    artist: 'Sample',
    key: 'C',
    body: `{title:Demo}\n{key:C}\n[C]ချစ်တယ် [F]ဆိုတဲ့ [C]စကား [G]တစ်ခါ\n[C]နှုတ်ဆက် [F]မဆိုမီ [G]ဆိုလိုက် [C]ပါ`,
  },
];

export function getSongById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
