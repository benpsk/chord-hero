import { useInfiniteQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type ReleaseYearRecord = {
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

export type UseReleaseYearsSearchParams = {
  search?: string;
};

function buildPath(params: UseReleaseYearsSearchParams | undefined, page: number) {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  searchParams.set('page', String(page));
  const query = searchParams.toString();
  return query ? `/api/release-year?${query}` : '/api/release-year';
}

function getNextPageParam(lastPage?: PaginatedResponse<ReleaseYearRecord>) {
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

export function useReleaseYearsSearch(params?: UseReleaseYearsSearchParams) {
  return useInfiniteQuery({
    queryKey: ['release-years', params?.search ?? ''],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiGet<PaginatedResponse<ReleaseYearRecord>>(buildPath(params, pageParam)),
    getNextPageParam,
  });
}
