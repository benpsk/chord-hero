import React, { useCallback, useMemo } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import { SongCreateScreen } from '@/components/song/create/SongCreateScreen';
import { useUpdateSongMutation } from '@/hooks/useUpdateSong';
import type { SongRecord } from '@/hooks/useSongsSearch';
import type { CreateSongPayload } from '@/hooks/useCreateSong';

export default function SongEditRoute() {
  const { id, item } = useLocalSearchParams<{ id: string; item?: string }>();

  const parsedSong = useMemo(() => {
    if (!item) return null;
    try {
      return JSON.parse(item) as SongRecord;
    } catch (error) {
      console.warn('Unable to parse song payload for editing.', error);
      return null;
    }
  }, [item]);

  const numericSongId = useMemo(() => {
    const fromParam = Number(id);
    if (Number.isFinite(fromParam)) {
      return fromParam;
    }
    if (parsedSong?.id != null) {
      return parsedSong.id;
    }
    return NaN;
  }, [id, parsedSong?.id]);

  const updateSongMutation = useUpdateSongMutation();

  const handleSubmit = useCallback(
    async (payload: CreateSongPayload) => {
      if (!Number.isFinite(numericSongId)) {
        throw new Error('Missing song id for update.');
      }
      const response = await updateSongMutation.mutateAsync({ id: Number(numericSongId), payload });
      return { message: response?.message ?? 'Song updated successfully.' };
    },
    [numericSongId, updateSongMutation]
  );

  if (!parsedSong || !Number.isFinite(numericSongId)) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Song' }} />
      <SongCreateScreen
        mode="edit"
        initialSong={parsedSong}
        onSubmit={handleSubmit}
        isSubmittingOverride={updateSongMutation.isPending}
        submitLabel="Save changes"
        resetOnSuccess={false}
      />
    </>
  );
}
