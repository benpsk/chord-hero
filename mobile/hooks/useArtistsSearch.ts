import { useInfiniteQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type ArtistRecord = {
  id: number;
  name: string;
  total?: number | null;
};

type PaginatedResponse<T> = {
  data: T[];
  page?: number;
  per_page?: number;
  total?: number;
};

type ArtistsPage = PaginatedResponse<ArtistRecord> | ArtistRecord[];

export type UseArtistsSearchParams = {
  search?: string;
};

function buildPath(params: UseArtistsSearchParams | undefined, page: number) {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  searchParams.set('page', String(page));
  const query = searchParams.toString();
  return query ? `/api/artists?${query}` : '/api/artists';
}

function isPaginatedResponse(page: ArtistsPage): page is PaginatedResponse<ArtistRecord> {
  return !!page && !Array.isArray(page);
}

function extractPageData(page: ArtistsPage): ArtistRecord[] {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  return Array.isArray(page.data) ? page.data : [];
}

export function useArtistsSearch(params?: UseArtistsSearchParams) {
  return useInfiniteQuery({
    queryKey: ['artists', params?.search ?? ''],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => apiGet<ArtistsPage>(buildPath(params, pageParam)),
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

      return allPages.length + 1;
    },
  });
}
