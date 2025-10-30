import { useInfiniteQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type AlbumRecord = {
  id: number;
  name: string;
  total?: number | null;
  release_year?: number | null;
  artists?: Array<{
    id: number;
    name: string | null;
  }>;
  writers?: Array<{
    id: number;
    name: string | null;
  }>;
};

type PaginatedResponse<T> = {
  data: T[];
  page?: number;
  per_page?: number;
  total?: number;
};

export type UseAlbumsSearchParams = {
  search?: string;
};

function buildPath(params: UseAlbumsSearchParams | undefined, page: number) {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  searchParams.set('page', String(page));
  const query = searchParams.toString();
  return query ? `/api/albums?${query}` : '/api/albums';
}

function getNextPageParam(lastPage?: PaginatedResponse<AlbumRecord>) {
  if (!lastPage) return undefined;

  const page = lastPage.page ?? 1;
  const perPage =
    lastPage.per_page ?? (Array.isArray(lastPage.data) ? lastPage.data.length : 0);
  const total = lastPage.total;

  if (perPage === 0) return undefined;
  if (total != null) {
    if (page * perPage >= total) {
      return undefined;
    }
  }
  if (lastPage.data.length < perPage) {
    return undefined;
  }
  return page + 1;
}

export function useAlbumsSearch(params?: UseAlbumsSearchParams) {
  return useInfiniteQuery({
    queryKey: ['albums', params?.search ?? ''],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiGet<PaginatedResponse<AlbumRecord>>(buildPath(params, pageParam)),
    getNextPageParam,
  });
}
