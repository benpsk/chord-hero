import { useInfiniteQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type SongRecord = {
  id: number;
  title: string;
  level?: string | null;
  key?: string | null;
  language?: string | null;
  lyric?: string | null;
  release_year?: number | null;
  is_bookmark?: boolean;
  artists?: Array<{ id: number; name: string | null }>;
  writers?: Array<{ id: number; name: string | null }>;
  albums?: Array<{ id: number; name: string | null; release_year?: number | null }>;
};

type PaginatedResponse<T> = {
  data: T[];
  page?: number;
  per_page?: number;
  total?: number;
};

export type UseSongsSearchParams = {
  search?: string;
};

type SongsPage = PaginatedResponse<SongRecord> | SongRecord[];

function isPaginatedResponse(page: SongsPage): page is PaginatedResponse<SongRecord> {
  return !!page && !Array.isArray(page);
}

function extractPageData(page: SongsPage): SongRecord[] {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  return Array.isArray(page.data) ? page.data : [];
}

function buildPath(params: UseSongsSearchParams | undefined, page: number) {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  searchParams.set('page', String(page));
  const query = searchParams.toString();
  return query ? `/api/songs?${query}` : '/api/songs';
}

export function useSongsSearch(params?: UseSongsSearchParams) {
  return useInfiniteQuery({
    queryKey: ['songs', params?.search ?? ''],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => apiGet<SongsPage>(buildPath(params, pageParam)),
    getNextPageParam: (lastPage, allPages) => {
      const data = extractPageData(lastPage);
      if (data.length === 0) {
        return undefined;
      }

      if (isPaginatedResponse(lastPage)) {
        const perPage = lastPage.per_page ?? data.length;
        const total = lastPage.total;

        if (typeof total === 'number') {
          const accumulated = allPages.reduce(
            (sum, page) => sum + extractPageData(page).length,
            0
          );
          if (accumulated >= total) {
            return undefined;
          }
        }

        if (data.length < perPage) {
          return undefined;
        }

        return (lastPage.page ?? allPages.length) + 1;
      }

      // Fallback for plain array responses: increment page by list length if we still receive data
      return allPages.length + 1;
    },
  });
}
