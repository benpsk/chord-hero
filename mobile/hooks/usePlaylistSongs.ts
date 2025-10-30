import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import type { SongRecord } from './useSongsSearch';

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

function buildPath(playlistId: number) {
  const params = new URLSearchParams();
  params.set('playlist_id', String(playlistId));
  return `/api/songs?${params.toString()}`;
}

export function usePlaylistSongs(playlistId?: number) {
  return useQuery({
    queryKey: ['playlists', playlistId, 'songs'],
    enabled: typeof playlistId === 'number' && Number.isFinite(playlistId) && playlistId > 0,
    queryFn: () => apiGet<PaginatedResponse<SongRecord>>(buildPath(playlistId as number)),
  });
}
