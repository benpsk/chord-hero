import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiPost } from '@/lib/api';

type AssignLevelParams = {
  songId: number;
  levelId: number;
};

type AssignLevelResponse = {
  message?: string;
};

async function assignLevel({ songId, levelId }: AssignLevelParams) {
  return apiPost<undefined, AssignLevelResponse>(`/api/songs/${songId}/levels/${levelId}`, undefined);
}

export function useAssignSongLevelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.some((value) => typeof value === 'string' && value.includes('song')) });
    },
  });
}

