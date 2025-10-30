import { useInfiniteQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type SongRecord = {
  id: number;
  title: string;
  level?: { id: number; name: string | null } | null;
  key?: string | null;
  language: { id: number; name: string };
  lyric: string;
  release_year?: number | null;
  artists?: Array<{ id: number; name: string | null }>;
  writers?: Array<{ id: number; name: string | null }>;
  albums?: Array<{ id: number; name: string | null; release_year?: number | null }>;
  playlist_ids?: number[];
};

type PaginatedResponse<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

export type UseSongsSearchParams = {
  search?: string;
  userId?: number;
};

function buildPath(params: UseSongsSearchParams | undefined, page: number) {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  if (typeof params?.userId === 'number' && Number.isFinite(params.userId)) {
    searchParams.set('user_id', String(params.userId));
  }
  searchParams.set('page', String(page));
  const query = searchParams.toString();
  return query ? `/api/songs?${query}` : '/api/songs';
}

type UseSongsSearchOptions = {
  enabled?: boolean;
};

export function useSongsSearch(params?: UseSongsSearchParams, options?: UseSongsSearchOptions) {
  const enabled = options?.enabled ?? true;
  return useInfiniteQuery({
    queryKey: ['songs', params?.search ?? '', params?.userId ?? null],
    initialPageParam: 1,
    enabled,
    queryFn: ({ pageParam }) => apiGet<PaginatedResponse<SongRecord>>(buildPath(params, pageParam)),
    getNextPageParam: (lastPage) => {
      if (!lastPage) {
        return undefined;
      }
      const totalPages = Math.ceil(lastPage.total / lastPage.per_page);
      if (lastPage.page >= totalPages) {
        return undefined;
      }
      return lastPage.page + 1;
    },
  });
}
