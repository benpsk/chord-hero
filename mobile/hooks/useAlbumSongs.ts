import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import type { SongRecord } from './useSongsSearch';

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

function buildPath(albumId: number) {
  const params = new URLSearchParams();
  params.set('album_id', String(albumId));
  return `/api/songs?${params.toString()}`;
}

export function useAlbumSongs(albumId?: number) {
  return useQuery({
    queryKey: ['albums', albumId, 'songs'],
    enabled: typeof albumId === 'number' && Number.isFinite(albumId) && albumId > 0,
    queryFn: () => apiGet<PaginatedResponse<SongRecord>>(buildPath(albumId as number)),
  });
}
