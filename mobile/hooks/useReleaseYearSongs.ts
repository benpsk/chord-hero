import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import type { SongRecord } from './useSongsSearch';

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

function buildPath(releaseYear: number) {
  const params = new URLSearchParams();
  params.set('release_year', String(releaseYear));
  return `/api/songs?${params.toString()}`;
}

export function useReleaseYearSongs(releaseYear?: number) {
  return useQuery({
    queryKey: ['release-years', releaseYear, 'songs'],
    enabled:
      typeof releaseYear === 'number' && Number.isFinite(releaseYear) && releaseYear > 0,
    queryFn: () => apiGet<PaginatedResponse<SongRecord>>(buildPath(releaseYear as number)),
  });
}
