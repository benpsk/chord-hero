import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type SearchableEntity = {
  id: number;
  name?: string | null;
  [key: string]: unknown;
};

type SearchResponse<TEntity> = {
  data: TEntity[];
  page?: number;
  per_page?: number;
  total?: number;
};

function buildSearchPath(path: string, search: string) {
  const trimmed = search.trim();
  if (!trimmed) {
    return path;
  }
  const params = new URLSearchParams();
  params.set('search', trimmed);
  return `${path}?${params.toString()}`;
}

export function useEntitySearch<TEntity extends SearchableEntity>(
  path: string,
  search: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['entity-search', path, search.trim().toLowerCase()],
    queryFn: () => apiGet<SearchResponse<TEntity>>(buildSearchPath(path, search)),
    enabled,
    staleTime: 30_000,
  });
}
