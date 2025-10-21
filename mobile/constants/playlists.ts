export type Playlist = {
  id: string;
  name: string;
  description?: string;
};

export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-1',
    name: 'Warmup Favorites',
    description: 'Quick exercises to get the fingers moving',
  },
  {
    id: 'pl-2',
    name: 'Practice Later',
    description: 'Songs to revisit when you have more time',
  },
  {
    id: 'pl-3',
    name: 'Performance Set',
    description: 'Arrangements ready for the next gig',
  },
  {
    id: 'pl-4',
    name: 'Songwriting Ideas',
    description: 'Tracks that inspire new compositions',
  },
];
