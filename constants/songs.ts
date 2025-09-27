export type Song = {
  id: string;
  title: string;
  artist?: string;
  composer?: string;
  level?: string;
  key?: string;
  language?: 'English' | 'Burmese' | 'Zomi' | string;
  body: string; // ChordPro content
};

export const SONGS: Song[] = [
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Traditional',
    composer: 'Graham, Billie',
    level: 'Easy',
    key: 'G',
    language: 'English',
    body: `Key:[G]\nIntro: [A] [G] [C] [A] [D]\n||\nVerse 1\n [C]Amazing [G]grace, how [C]sweet the [G]sound\nThat [G]saved a [C]wretch like [D]me\n[G]I once was [C]lost, but [G]now am [C]found\nWas [G]blind, but [D]now I [G]see\nVerse 2\n [C]Amazing [G]grace, how [C]sweet the [G]sound\nThat [G]saved a [C]wretch like [D]me\n[G]I once was [C]lost, but [G]now am [C]found\nWas [G]blind, but [D]now I [G]see \nVerse 3\n [C]Amazing [G]grace, how [C]sweet the [G]sound\nThat [G]saved a [C]wretch like [D]me\n[G]I once was [C]lost, but [G]now am [C]found\nWas [G]blind, but [D]now I [G]see \nVerse 4\n [C]Amazing [G]grace, how [C]sweet the [G]sound\nThat [G]saved a [C]wretch like [D]me\n[G]I once was [C]lost, but [G]now am [C]found\nWas [G]blind, but [D]now I [G]see \nVerse 4\n [C]Amazing [G]grace, how [C]sweet the [G]sound\nThat [G]saved a [C]wretch like [D]me\n[G]I once was [C]lost, but [G]now am [C]found\nWas [G]blind, but [D]now I [G]see`,
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    artist: 'Traditional',
    composer: 'Nightingle',
    level: 'Medium',
    key: 'G',
    language: 'English',
    body: `Key:[A]\n Intro: [A] [G] [C] [A] [D]\n\n||\nVerse 2\n [G]Should auld ac[D]quaintance be [G]forgot,\nAnd [C]never [D]brought to [G]mind?\n[G]Should auld ac[D]quaintance be [G]forgot,\nAnd [C]days of [D]auld lang [G]syne.\n\n[G]For auld lang [C]syne, my [G]dear,\nFor [C]auld lang [D]syne,\n[G]We'll tak a [D]cup o' [G]kindness yet,\nFor [C]auld [D]lang [G]syne.`,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    artist: 'Traditional',
    composer: 'Green Slaver',
    level: 'Medium',
    key: 'Em',
    language: 'English',
    body: `Key:[D]\n Intro: [A ][G ][C ][A ][D]\n\n||\nCho\n[Em]Alas, my [D]love, you [G]do me [B7]wrong\nTo [Em]cast me [D]off dis[G]courteously [B7]\n[Em]For I have [D]loved you [G]well and [B7]long\nDe[Em]lighting [D]in your [G]compa[B7]ny\n\n[Em]Greensleeves was [G]all my joy\n[D]Greensleeves was my [B7]delight\n[Em]Greensleeves was my [G]heart of gold\n[D]And who but my [B7]lady [Em]Greensleeves`,
  },
];

export function getSongById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
