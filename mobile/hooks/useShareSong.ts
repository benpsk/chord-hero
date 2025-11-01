import { useMutation } from '@tanstack/react-query';

import { apiPost } from '@/lib/api';

type ShareSongStatus = 'created' | 'pending';

type ShareSongParams = {
  songId: number;
  status: ShareSongStatus;
};

type ShareSongResponse = {
  message?: string;
};

async function shareSong({ songId, status }: ShareSongParams) {
  return apiPost<undefined, ShareSongResponse>(`/api/songs/${songId}/status/${status}`, undefined);
}

export function useShareSongMutation() {
  return useMutation({
    mutationFn: shareSong,
  });
}

