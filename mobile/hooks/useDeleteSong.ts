import { useMutation } from '@tanstack/react-query';

import { apiDelete } from '@/lib/api';

type DeleteSongResponse = {
  message?: string;
};

async function deleteSong(id: number) {
  return apiDelete<DeleteSongResponse>(`/api/songs/${id}`);
}

export function useDeleteSongMutation() {
  return useMutation({
    mutationFn: deleteSong,
  });
}
