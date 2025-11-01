import { useInfiniteQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type SongRecord = {
  id: number;
  title: string;
  status?: string | null;
  level?: { id: number; name: string | null } | null;
  key?: string | null;
  language: { id: number; name: string };
  lyric: string;
  release_year?: number | null;
  created?: { id: number; email: string } | null;
  artists?: Array<{ id: number; name: string | null }>;
  writers?: Array<{ id: number; name: string | null }>;
  albums?: Array<{ id: number; name: string | null; release_year?: number | null }>;
  playlist_ids?: number[];
  user_level_id?: number | null;
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
  languageIds?: number[];
};

function buildPath(params: UseSongsSearchParams | undefined, page: number) {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  if (typeof params?.userId === 'number' && Number.isFinite(params.userId)) {
    searchParams.set('user_id', String(params.userId));
  }
  if (Array.isArray(params?.languageIds) && params.languageIds.length > 0) {
    const filtered = params.languageIds.filter((value) => Number.isFinite(value));
    if (filtered.length > 0) {
      searchParams.set('language_ids', filtered.join(','));
    }
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
  const languageKey = Array.isArray(params?.languageIds) && params?.languageIds.length
    ? params.languageIds.filter((value) => Number.isFinite(value)).join(',')
    : null;

  return useInfiniteQuery({
    queryKey: ['songs', params?.search ?? '', params?.userId ?? null, languageKey],
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
