export const FILTER_LANGUAGES = ['English', 'Burmese', 'Zomi'] as const;
export type FilterLanguage = (typeof FILTER_LANGUAGES)[number];

export type ChartTrack = {
  id: string;
  title: string;
  artists: string;
  key: string;
  difficulty: string;
  language?: FilterLanguage;
};

export type ChartDetail = {
  id: string;
  cardTitle: string;
  cardSubtitle: string;
  heading: string;
  description: string;
  tracks: ChartTrack[];
};

export type HomeCard = {
  id: string;
  title: string;
  subtitle: string;
};

export const WEEKLY_CHARTS: HomeCard[] = [
  { id: 'easy', title: 'Top 50', subtitle: 'Easy' },
  { id: 'medium', title: 'Top 50', subtitle: 'Medium' },
  { id: 'trending', title: 'Top 50', subtitle: 'Trending' },
  { id: 'hard', title: 'Top 50', subtitle: 'Hard' },
  { id: 'legend', title: 'Top 50', subtitle: 'Legend' },
  { id: 'fresh', title: 'Top 50', subtitle: 'Fresh' },
];

export const TRENDING_ALBUMS: HomeCard[] = [
  { id: 'cloud', title: 'Cloud', subtitle: 'MJ' },
  { id: 'topping', title: 'Topping', subtitle: 'GNR' },
  { id: 'pulse', title: 'Pulse', subtitle: 'Travis' },
];

export const HOME_DETAILS: Record<string, ChartDetail> = {
  easy: {
    id: 'easy',
    cardTitle: 'Top 50',
    cardSubtitle: 'Easy',
    heading: 'Top 50 – Easy',
    description: 'Weekly chart-toppers update',
    tracks: [
      { id: 'flower-1', title: 'FLOWER', artists: 'Jessica Gonzalez | Jeff Clay', key: 'G', difficulty: 'Easy', language: 'Burmese' },
      { id: 'flower-2', title: 'FLOWER', artists: 'Jessica Gonzalez | Jeff Clay', key: 'G', difficulty: 'Easy', language: 'English' },
      { id: 'flower-3', title: 'FLOWER', artists: 'Jessica Gonzalez | Jeff Clay', key: 'G', difficulty: 'Easy', language: 'Zomi' },
      { id: 'flower-4', title: 'FLOWER', artists: 'Jessica Gonzalez | Jeff Clay', key: 'G', difficulty: 'Easy', language: 'English' },
    ],
  },
  medium: {
    id: 'medium',
    cardTitle: 'Top 50',
    cardSubtitle: 'Medium',
    heading: 'Top 50 – Medium',
    description: 'Weekly chart-toppers update',
    tracks: [
      { id: 'horizon-1', title: 'HORIZON', artists: 'Reina Carter | Moe Lwin', key: 'F', difficulty: 'Medium', language: 'English' },
      { id: 'horizon-2', title: 'HORIZON', artists: 'Reina Carter | Moe Lwin', key: 'F', difficulty: 'Medium', language: 'Burmese' },
      { id: 'horizon-3', title: 'HORIZON', artists: 'Reina Carter | Moe Lwin', key: 'F', difficulty: 'Medium', language: 'English' },
    ],
  },
  trending: {
    id: 'trending',
    cardTitle: 'Top 50',
    cardSubtitle: 'Trending',
    heading: 'Top 50 – Trending',
    description: 'Weekly chart-toppers update',
    tracks: [
      { id: 'pulse-1', title: 'PULSE', artists: 'Ngwe Tun | Alex Rivers', key: 'C', difficulty: 'Trending', language: 'English' },
      { id: 'pulse-2', title: 'PULSE', artists: 'Ngwe Tun | Alex Rivers', key: 'C', difficulty: 'Trending', language: 'Zomi' },
    ],
  },
  hard: {
    id: 'hard',
    cardTitle: 'Top 50',
    cardSubtitle: 'Hard',
    heading: 'Top 50 – Hard',
    description: 'Weekly chart-toppers update',
    tracks: [
      { id: 'ignite-1', title: 'IGNITE', artists: 'Ravi Kumar | Min Khant', key: 'A', difficulty: 'Hard', language: 'English' },
      { id: 'ignite-2', title: 'IGNITE', artists: 'Ravi Kumar | Min Khant', key: 'A', difficulty: 'Hard', language: 'Burmese' },
    ],
  },
  legend: {
    id: 'legend',
    cardTitle: 'Top 50',
    cardSubtitle: 'Legend',
    heading: 'Top 50 – Legend',
    description: 'Weekly chart-toppers update',
    tracks: [
      { id: 'legendary-1', title: 'LEGENDARY', artists: 'Su Thiri | Arthur Phyo', key: 'D', difficulty: 'Legend', language: 'English' },
      { id: 'legendary-2', title: 'LEGENDARY', artists: 'Su Thiri | Arthur Phyo', key: 'D', difficulty: 'Legend', language: 'English' },
    ],
  },
  fresh: {
    id: 'fresh',
    cardTitle: 'Top 50',
    cardSubtitle: 'Fresh',
    heading: 'Top 50 – Fresh',
    description: 'Weekly chart-toppers update',
    tracks: [
      { id: 'fresh-1', title: 'FRESH AIR', artists: 'Gigi Thant | Leo West', key: 'E', difficulty: 'Fresh', language: 'Burmese' },
    ],
  },
  cloud: {
    id: 'cloud',
    cardTitle: 'Cloud',
    cardSubtitle: 'MJ',
    heading: 'Cloud – MJ',
    description: 'Latest release from MJ',
    tracks: [
      { id: 'cloud-1', title: 'CIRRUS', artists: 'MJ', key: 'B', difficulty: 'Easy', language: 'English' },
      { id: 'cloud-2', title: 'STRATUS', artists: 'MJ', key: 'E', difficulty: 'Medium', language: 'English' },
    ],
  },
  topping: {
    id: 'topping',
    cardTitle: 'Topping',
    cardSubtitle: 'GNR',
    heading: 'Topping – GNR',
    description: 'Fan favourites from GNR',
    tracks: [
      { id: 'topping-1', title: 'RIPPLE', artists: 'GNR', key: 'A', difficulty: 'Medium', language: 'English' },
    ],
  },
  pulse: {
    id: 'pulse',
    cardTitle: 'Pulse',
    cardSubtitle: 'Travis',
    heading: 'Pulse – Travis',
    description: 'Live session highlights',
    tracks: [
      { id: 'pulse-live-1', title: 'HEARTLINE', artists: 'Travis', key: 'G', difficulty: 'Easy', language: 'English' },
    ],
  },
};

export const POPULAR_ARTISTS = [
  { id: 'jennifer', name: 'Jennifer Wilson' },
  { id: 'elizabeth', name: 'Elizabeth Hall' },
  { id: 'anthony', name: 'Anthony Cole' },
];
