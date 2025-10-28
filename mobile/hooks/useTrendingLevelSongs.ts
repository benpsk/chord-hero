import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import type { SongRecord } from './useSongsSearch';

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

export function useTrendingLevelSongs(levelId?: number) {
  return useQuery({
    queryKey: ['songs', 'trending', levelId],
    enabled: typeof levelId === 'number' && Number.isFinite(levelId) && levelId > 0,
    queryFn: () =>
      apiGet<PaginatedResponse<SongRecord>>(
        `/api/songs?is_trending=1&level_id=${levelId}`
      ),
  });
}
