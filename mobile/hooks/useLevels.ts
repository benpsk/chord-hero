import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type LevelOption = {
  id: number;
  name: string | null;
};

type LevelsResponse = {
  data: LevelOption[];
};

async function fetchLevels() {
  return apiGet<LevelsResponse>('/api/levels');
}

export function useLevels(enabled: boolean) {
  return useQuery({
    queryKey: ['levels'],
    queryFn: fetchLevels,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
