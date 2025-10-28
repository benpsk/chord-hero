import { useMutation } from '@tanstack/react-query';

import { apiPost } from '@/lib/api';

export type CreateSongPayload = {
  title: string;
  level_id: number;
  key: string;
  language_id: number;
  lyric: string;
  release_year?: number | string | null;
  album_ids?: number[];
  artist_ids?: number[];
  writer_ids?: number[];
};

type CreateSongResponse = {
  data?: {
    id?: number;
    [key: string]: unknown;
  };
  message?: string;
};

async function createSong(payload: CreateSongPayload) {
  return apiPost<CreateSongPayload, CreateSongResponse>('/api/songs', payload);
}

export function useCreateSongMutation() {
  return useMutation({
    mutationFn: createSong,
  });
}
