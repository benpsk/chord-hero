import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import type { SongRecord } from './useSongsSearch';

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

function buildPath(artistId: number) {
  const params = new URLSearchParams();
  params.set('artist_id', String(artistId));
  return `/api/songs?${params.toString()}`;
}

export function useArtistSongs(artistId?: number) {
  return useQuery({
    queryKey: ['artists', artistId, 'songs'],
    enabled: typeof artistId === 'number' && Number.isFinite(artistId) && artistId > 0,
    queryFn: () => apiGet<PaginatedResponse<SongRecord>>(buildPath(artistId as number)),
  });
}
