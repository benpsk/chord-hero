import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api';

export type PlaylistSummary = {
  id: number | string;
  name: string;
  total: number;
};

type PlaylistsResponse = {
  data: PlaylistSummary[];
  page?: number;
  per_page?: number;
  total?: number;
};

type CreatePlaylistPayload = {
  name: string;
};

type CreatePlaylistResponse = {
  data?: PlaylistSummary;
};

async function fetchPlaylists() {
  return apiGet<PlaylistsResponse>('/api/playlists');
}

async function createPlaylist(payload: CreatePlaylistPayload) {
  return apiPost<CreatePlaylistPayload, CreatePlaylistResponse>('/api/playlists/create', payload);
}

type AttachSongsOptions = {
  playlistId: number | string;
  songIds: Array<number | string>;
};

type AttachSongsResponse = {
  data?: { message?: string };
};

async function attachSongsToPlaylist({ playlistId, songIds }: AttachSongsOptions) {
  const idsSegment = songIds.join(',');
  return apiPost<Record<string, never>, AttachSongsResponse>(
    `/api/playlists/${playlistId}/songs/${idsSegment}`,
    {}
  );
}

export function usePlaylists(enabled: boolean) {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
    enabled,
  });
}

export function useCreatePlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useAttachSongsToPlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attachSongsToPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}
