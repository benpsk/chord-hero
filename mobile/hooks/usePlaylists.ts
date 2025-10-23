import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';

export type PlaylistSummary = {
  id: number | string;
  name: string;
  is_owner: boolean;
  total: number;
  shared_with?: { id: number | string; email: string }[];
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

type UpdatePlaylistResponse = {
  data?: { message?: string };
};

type DeletePlaylistResponse = {
  data?: { message?: string };
};

type SharePlaylistResponse = {
  data?: { message?: string };
};

type LeavePlaylistResponse = {
  data?: { message?: string };
};

type SharePlaylistPayload = {
  playlistId: number | string;
  userIds: (number | string)[];
};

async function fetchPlaylists() {
  return apiGet<PlaylistsResponse>('/api/playlists');
}

async function createPlaylist(payload: CreatePlaylistPayload) {
  return apiPost<CreatePlaylistPayload, CreatePlaylistResponse>('/api/playlists/create', payload);
}

async function updatePlaylist({
  playlistId,
  name,
}: {
  playlistId: number | string;
  name: string;
}) {
  return apiPut<{ name: string }, UpdatePlaylistResponse>(`/api/playlists/${playlistId}`, { name });
}

async function deletePlaylist({
  playlistId,
}: {
  playlistId: number | string;
}) {
  return apiDelete<DeletePlaylistResponse>(`/api/playlists/${playlistId}`);
}

async function sharePlaylist({ playlistId, userIds }: SharePlaylistPayload) {
  return apiPost<{ user_ids: (number | string)[] }, SharePlaylistResponse>(
    `/api/playlists/${playlistId}/share`,
    { user_ids: userIds }
  );
}

async function leavePlaylist({ playlistId }: { playlistId: number | string }) {
  return apiPost<Record<string, never>, LeavePlaylistResponse>(
    `/api/playlists/${playlistId}/leave`,
    {}
  );
}

type AttachSongsOptions = {
  playlistId: number | string;
  songIds: (number | string)[];
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

export function useUpdatePlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useDeletePlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useSharePlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useLeavePlaylistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leavePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}
