import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import type { SongRecord } from './useSongsSearch';

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

function buildPath(writerId: number) {
  const params = new URLSearchParams();
  params.set('writer_id', String(writerId));
  return `/api/songs?${params.toString()}`;
}

export function useWriterSongs(writerId?: number) {
  return useQuery({
    queryKey: ['writers', writerId, 'songs'],
    enabled: typeof writerId === 'number' && Number.isFinite(writerId) && writerId > 0,
    queryFn: () => apiGet<PaginatedResponse<SongRecord>>(buildPath(writerId as number)),
  });
}
