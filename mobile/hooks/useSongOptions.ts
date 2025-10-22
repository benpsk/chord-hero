import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import { SongRecord } from '@/hooks/useSongsSearch';

type SongsResponse = {
  data: SongRecord[];
  page?: number;
  per_page?: number;
  total?: number;
};

function buildSongsPath(search: string) {
  const params = new URLSearchParams();
  const trimmed = search.trim();
  if (trimmed) {
    params.set('search', trimmed);
  }
  params.set('per_page', '50');
  const query = params.toString();
  return query ? `/api/songs?${query}` : '/api/songs';
}

async function fetchSongOptions(search: string) {
  return apiGet<SongsResponse>(buildSongsPath(search));
}

export function useSongOptions(search: string, enabled: boolean) {
  return useQuery({
    queryKey: ['playlist-song-options', search],
    queryFn: () => fetchSongOptions(search),
    enabled,
    staleTime: 60_000,
  });
}
