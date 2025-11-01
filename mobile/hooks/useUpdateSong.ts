import { useMutation } from '@tanstack/react-query';

import { apiPut } from '@/lib/api';
import type { CreateSongPayload } from './useCreateSong';

type UpdateSongParams = {
  id: number;
  payload: CreateSongPayload;
};

type UpdateSongResponse = {
  message?: string;
};

async function updateSong({ id, payload }: UpdateSongParams) {
  return apiPut<CreateSongPayload, UpdateSongResponse>(`/api/songs/${id}`, payload);
}

export function useUpdateSongMutation() {
  return useMutation({
    mutationFn: updateSong,
  });
}
