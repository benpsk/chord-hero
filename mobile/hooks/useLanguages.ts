import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type LanguageOption = {
  id: number;
  name: string | null;
};

type LanguagesResponse = {
  data: LanguageOption[];
};

async function fetchLanguages() {
  return apiGet<LanguagesResponse>('/api/languages');
}

export function useLanguages(enabled: boolean) {
  return useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
