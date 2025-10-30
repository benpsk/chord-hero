import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Button, IconButton, Surface, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { TrackList } from '@/components/search/TrackList';
import { SharePlaylistModal } from '@/components/library/SharePlaylistModal';
import { CreatePlaylistFlowModal } from '@/components/library/CreatePlaylistFlowModal';
import type { SongRecord } from '@/hooks/useSongsSearch';
import { usePlaylistSongs } from '@/hooks/usePlaylistSongs';
import type { PlaylistSummary } from '@/hooks/usePlaylists';
import { useSharePlaylistMutation } from '@/hooks/usePlaylists';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiPost } from '@/lib/api';
import { useSongOptions } from '@/hooks/useSongOptions';

export default function PlaylistDetailScreen() {
  const { id, item } = useLocalSearchParams<{ id: string; item?: string }>();

  const playlistParam = Array.isArray(id) ? id[0] : id;
  const playlistItemParam = Array.isArray(item) ? item[0] : item;

  const parsedPlaylist = useMemo<PlaylistSummary | undefined>(() => {
    if (!playlistItemParam) return undefined;
    try {
      return JSON.parse(playlistItemParam) as PlaylistSummary;
    } catch {
      return undefined;
    }
  }, [playlistItemParam]);

  const playlistId = useMemo(() => {
    if (!playlistParam) return undefined;
    const parsed = Number(playlistParam);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [playlistParam]);

  const theme = useTheme();
  const router = useRouter();

  const { data: playlistSongsResponse, isLoading: isPlaylistLoading } = usePlaylistSongs(playlistId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<Set<number | string>>(new Set());
  const queryClient = useQueryClient();

  const removeSongsMutation = useMutation({
    mutationFn: async (songIds: number[]) => {
      if (!playlistId) {
        return;
      }
      return apiPost<{ song_ids: number[]; action: 'remove' }, { data?: { message?: string } }>(
        `/api/playlists/${playlistId}/songs`,
        { song_ids: songIds, action: 'remove' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId, 'songs'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-song-options'] });
    },
  });

  const attachSongsMutation = useMutation({
    mutationFn: async (songIds: number[]) => {
      if (!playlistId) {
        return;
      }
      return apiPost<{ song_ids: number[]; action: 'add' }, { data?: { message?: string } }>(
        `/api/playlists/${playlistId}/songs`,
        { song_ids: songIds, action: 'add' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId, 'songs'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-song-options'] });
    },
  });

  const songs = useMemo(() => playlistSongsResponse?.data ?? [], [playlistSongsResponse]);
  const totalTracks = playlistSongsResponse?.total ?? parsedPlaylist?.total ?? songs.length;
  const playlistName = parsedPlaylist?.name ?? 'Playlist';

  const [addSongsVisible, setAddSongsVisible] = useState(false);
  const [addSongSearch, setAddSongSearch] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number | string>>(
    () => new Set<number | string>()
  );
  const [songSubmitError, setSongSubmitError] = useState<string | null>(null);
  const songsQueryEnabled = addSongsVisible && Boolean(playlistId);
  const songOptionsQuery = useSongOptions(addSongSearch, songsQueryEnabled);
  const songOptions = songOptionsQuery.data?.data ?? [];
  const isLoadingSongOptions =
    songOptionsQuery.isLoading || (songOptionsQuery.isFetching && songOptions.length === 0);
  const songsErrorMessage =
    songOptionsQuery.error instanceof ApiError
      ? songOptionsQuery.error.message
      : 'Unable to load songs right now.';

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<{ id: number | string; email: string }[]>([]);
  const [shareSearchLoading, setShareSearchLoading] = useState(false);
  const [shareSearchError, setShareSearchError] = useState<string | null>(null);
  const [shareSubmitError, setShareSubmitError] = useState<string | null>(null);
  const [selectedShareUsers, setSelectedShareUsers] = useState<
    Map<string, { id: number | string; email: string }>
  >(() => new Map());
  const shareSearchDebounceRef = useRef<NodeJS.Timeout | number | null>(null);
  const { mutateAsync: sharePlaylistRequest, reset: resetSharePlaylistMutation, isPending: isSharingPlaylist } =
    useSharePlaylistMutation();

  useEffect(() => {
    if (!shareModalVisible) {
      setShareSearch('');
      setShareSearchResults([]);
      setShareSearchLoading(false);
      setShareSearchError(null);
      setShareSubmitError(null);
      setSelectedShareUsers(new Map());
      resetSharePlaylistMutation();
      if (shareSearchDebounceRef.current) {
        clearTimeout(shareSearchDebounceRef.current);
        shareSearchDebounceRef.current = null;
      }
      return;
    }
  }, [resetSharePlaylistMutation, shareModalVisible]);

  const handleShareSearchChange = useCallback((value: string) => {
    setShareSearch(value);
    setShareSearchError(null);
    setShareSubmitError(null);
    if (shareSearchDebounceRef.current) {
      clearTimeout(shareSearchDebounceRef.current);
      shareSearchDebounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!shareModalVisible) {
      return;
    }

    if (shareSearchDebounceRef.current) {
      clearTimeout(shareSearchDebounceRef.current);
      shareSearchDebounceRef.current = null;
    }

    const query = shareSearch.trim();
    if (query.length < 3) {
      setShareSearchResults([]);
      setShareSearchLoading(false);
      setShareSearchError(null);
      return;
    }

    setShareSearchLoading(true);
    setShareSearchError(null);

    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        const response = await apiPost<Record<string, never>, { data?: { id: number | string; email: string }[] }>(
          `/api/users?email=${encodeURIComponent(query)}`,
          {}
        );
        if (cancelled) {
          return;
        }
        setShareSearchResults(response?.data ?? []);
        setShareSearchError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setShareSearchResults([]);
        if (error instanceof ApiError) {
          setShareSearchError(error.message);
        } else {
          setShareSearchError('Unable to search users. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setShareSearchLoading(false);
          shareSearchDebounceRef.current = null;
        }
      }
    }, 400);

    shareSearchDebounceRef.current = timeout;

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      shareSearchDebounceRef.current = null;
    };
  }, [shareModalVisible, shareSearch]);

  const toggleShareUser = useCallback((user: { id: number | string; email: string }) => {
    const key = String(user.id);
    setSelectedShareUsers((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, user);
      }
      return next;
    });
  }, []);

  const handleRemoveShareUser = useCallback((userId: number | string) => {
    const key = String(userId);
    setSelectedShareUsers((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const selectedShareUsersList = useMemo(
    () => Array.from(selectedShareUsers.values()),
    [selectedShareUsers]
  );

  const isShareUserSelected = useCallback(
    (userId: number | string) => selectedShareUsers.has(String(userId)),
    [selectedShareUsers]
  );

  useEffect(() => {
    if (!addSongsVisible || !playlistId) {
      return;
    }
    const options = songOptionsQuery.data?.data ?? [];
    if (!options || options.length === 0) {
      return;
    }
    const preselected = options
      .filter((song) => (song.playlist_ids ?? []).some((id) => Number(id) === playlistId))
      .map((song) => song.id)
      .filter((id): id is number => id != null);
    if (preselected.length === 0) {
      return;
    }
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      preselected.forEach((id) => next.add(id));
      return next;
    });
  }, [addSongsVisible, playlistId, songOptionsQuery.data]);

  const handleShareConfirm = useCallback(async () => {
    if (!playlistId) {
      return;
    }
    const userIds = selectedShareUsersList.map((user) => user.id);
    try {
      await sharePlaylistRequest({ playlistId, userIds });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShareModalVisible(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setShareSubmitError(message);
    }
  }, [playlistId, queryClient, selectedShareUsersList, sharePlaylistRequest]);

  const handleOpenAddSongs = useCallback(() => {
    if (!playlistId) {
      return;
    }
    const existingIds = songs
      .map((song) => song.id)
      .filter((id): id is number => id != null);
    setSelectedSongIds(new Set(existingIds));
    setSongSubmitError(null);
    setAddSongSearch('');
    setAddSongsVisible(true);
  }, [playlistId, songs]);

  const handleCloseAddSongs = useCallback(() => {
    setAddSongsVisible(false);
    setAddSongSearch('');
    setSelectedSongIds(new Set<number | string>());
    setSongSubmitError(null);
  }, []);

  const handleAddSongSearchChange = useCallback((value: string) => {
    setAddSongSearch(value);
    if (songSubmitError) {
      setSongSubmitError(null);
    }
  }, [songSubmitError]);

  const handleToggleSongSelection = useCallback((id: number | string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (songSubmitError) {
      setSongSubmitError(null);
    }
  }, [songSubmitError]);

  const handleClearSongSelection = useCallback(() => {
    setSelectedSongIds(new Set<number | string>());
    setSongSubmitError(null);
  }, []);

  const isSongSelected = useCallback(
    (id: number | string) => selectedSongIds.has(id),
    [selectedSongIds]
  );

  const handleAttachSongs = useCallback(async () => {
    if (!playlistId) {
      setSongSubmitError('Playlist not ready yet. Please try again.');
      return;
    }
    if (selectedSongIds.size === 0) {
      setSongSubmitError('Select at least one song to continue.');
      return;
    }
    const songIds = Array.from(selectedSongIds)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (songIds.length === 0) {
      setSongSubmitError('Unable to resolve selected songs. Please try again.');
      return;
    }
    setSongSubmitError(null);
    try {
      await attachSongsMutation.mutateAsync(songIds);
      setAddSongsVisible(false);
      setAddSongSearch('');
      setSelectedSongIds(new Set<number | string>());
    } catch (error) {
      if (error instanceof ApiError) {
        setSongSubmitError(error.message);
      } else {
        setSongSubmitError('Unable to add songs. Please try again.');
      }
    }
  }, [attachSongsMutation, playlistId, selectedSongIds]);

  const headerMeta = useMemo(() => {
    if (isPlaylistLoading) {
      return 'Loading tracks...';
    }
    return `${totalTracks} ${totalTracks === 1 ? 'track' : 'tracks'}`;
  }, [isPlaylistLoading, totalTracks]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        content: {
          paddingHorizontal: 24,
          paddingBottom: 48,
          paddingTop: 12,
          gap: 24,
        },
        headerRow: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        coverCard: {
          width: 60,
          height: 60,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.secondaryContainer,
        },
        coverSubtitle: {
          fontWeight: '700',
          fontSize: 20,
          color: theme.colors.onSecondaryContainer,
        },
        headerInfo: {
          flex: 1,
          gap: 4,
        },
        headingText: {
          fontSize: 18,
          fontWeight: '600',
          color: theme.colors.onSurface,
        },
        metaText: {
          color: theme.colors.onSurfaceVariant,
        },
        section: {
          gap: 16,
        },
        loadingContainer: {
          paddingVertical: 48,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emptyState: {
          alignItems: 'center',
          paddingVertical: 60,
          gap: 16,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.background, theme.colors.onSecondaryContainer, theme.colors.onSurface, theme.colors.onSurfaceVariant, theme.colors.secondaryContainer]
  );

  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    setDeleteSelection(new Set(songs.map((song) => String(song.id))));
  }, [isDeleting, songs]);

  const handleOpenShare = useCallback(() => {
    const initialSelections = new Map<string, { id: number | string; email: string }>();
    parsedPlaylist?.shared_with?.forEach((user) => {
      if (!user) return;
      const { id, email } = user;
      if (id == null || !email) return;
      initialSelections.set(String(id), { id, email });
    });
    setSelectedShareUsers(initialSelections);
    setShareModalVisible(true);
    setShareSearch('');
    setShareSearchResults([]);
    setShareSearchLoading(false);
    setShareSearchError(null);
    setShareSubmitError(null);
    resetSharePlaylistMutation();
    if (shareSearchDebounceRef.current) {
      clearTimeout(shareSearchDebounceRef.current);
      shareSearchDebounceRef.current = null;
    }
  }, [parsedPlaylist, resetSharePlaylistMutation]);

  const bookmarkedItems = useMemo(() => new Set<string>(), []);

  const handleTrackPress = useCallback(
    (track: SongRecord) => {
      router.push({ pathname: '/song/[id]', params: { id: String(track.id), item: JSON.stringify(track) } });
    },
    [router]
  );

  const handleBeginDelete = useCallback(() => {
    if (songs.length === 0) {
      return;
    }
    setDeleteSelection(new Set(songs.map((song) => String(song.id))));
    setIsDeleting(true);
  }, [songs]);

  const handleToggleDeleteSelection = useCallback((id: number | string) => {
    setDeleteSelection((prev) => {
      const key = String(id);
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsDeleting(false);
    setDeleteSelection(new Set());
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!playlistId) {
      return;
    }
    const removalIds = songs
      .filter((song) => !deleteSelection.has(String(song.id)))
      .map((song) => Number(song.id))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (removalIds.length === 0) {
      handleCancelDelete();
      return;
    }

    try {
      await removeSongsMutation.mutateAsync(removalIds);
      handleCancelDelete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Unable to update playlist', message);
    }
  }, [deleteSelection, handleCancelDelete, playlistId, removeSongsMutation, songs]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: playlistName,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="share-variant"
                size={22}
                onPress={handleOpenShare}
                accessibilityLabel="Share playlist"
              />
              {isDeleting ? (
                <>
                  <IconButton
                    icon="close"
                    size={22}
                    disabled={removeSongsMutation.isPending}
                    onPress={handleCancelDelete}
                    accessibilityLabel="Cancel removal"
                  />
                  <IconButton
                    icon="check"
                    size={22}
                    disabled={removeSongsMutation.isPending}
                    onPress={handleConfirmDelete}
                    accessibilityLabel="Confirm removal"
                  />
                </>
              ) : (
                <IconButton
                  icon="trash-can-outline"
                  size={22}
                  disabled={songs.length === 0 || removeSongsMutation.isPending}
                  onPress={handleBeginDelete}
                  accessibilityLabel="Remove songs"
                />
              )}
            </View>
          ),
        }}
      />
      <Animated.ScrollView
        entering={FadeInUp.duration(360)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.headerRow} entering={FadeInUp.delay(80).duration(320)}>
          <Surface style={styles.coverCard} elevation={2}>
            <Text style={styles.coverSubtitle}>{playlistName.slice(0, 2).toUpperCase()}</Text>
          </Surface>
          <View style={styles.headerInfo}>
            <Text style={styles.headingText} numberOfLines={1}>
              {playlistName}
            </Text>
            <Text style={styles.metaText}>{headerMeta}</Text>
          </View>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeInUp.delay(200).duration(340)}>
          {isPlaylistLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating size="small" />
            </View>
          ) : (
            <TrackList
              tracks={songs}
              bookmarkedItems={bookmarkedItems}
              onPressBookmark={() => {}}
              onPressTrack={handleTrackPress}
              showBookmark={false}
              selectable={isDeleting as boolean}
              selectedItems={deleteSelection}
              onToggleSelect={handleToggleDeleteSelection}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No songs added yet.</Text>
                  <Button
                    mode="contained"
                    icon="playlist-plus"
                    onPress={handleOpenAddSongs}
                    disabled={!playlistId}
                  >
                    Add songs
                  </Button>
                </View>
              )}
            />
          )}
        </Animated.View>
      </Animated.ScrollView>
      <SharePlaylistModal
        visible={shareModalVisible}
        playlistName={playlistName}
        searchValue={shareSearch}
        onSearchChange={handleShareSearchChange}
        isLoading={shareSearchLoading}
        results={shareSearchResults}
        selectedUsers={selectedShareUsersList}
        isUserSelected={isShareUserSelected}
        onToggleUser={toggleShareUser}
        onRemoveUser={handleRemoveShareUser}
        errorMessage={shareSearchError}
        submitError={shareSubmitError}
        loadingSubmit={isSharingPlaylist}
        onDismiss={() => setShareModalVisible(false)}
        onConfirm={handleShareConfirm}
      />
      <CreatePlaylistFlowModal
        visible={addSongsVisible}
        step="songs"
        draftName={playlistName}
        nameError=""
        submitError={null}
        onChangeDraftName={(_value: string) => {}}
        onSubmitName={() => {}}
        onCancel={handleCloseAddSongs}
        isCreating={false}
        songSearch={addSongSearch}
        onChangeSongSearch={handleAddSongSearchChange}
        isSongQueryFetching={songOptionsQuery.isFetching}
        isLoadingSongOptions={isLoadingSongOptions}
        songOptions={songOptions}
        selectedCount={selectedSongIds.size}
        onToggleSong={handleToggleSongSelection}
        isSongSelected={isSongSelected}
        onClearSelection={handleClearSongSelection}
        songSubmitError={songSubmitError}
        onSubmitSongs={handleAttachSongs}
        isSubmittingSongs={attachSongsMutation.isPending}
        currentPlaylistName={playlistName}
        songsErrorMessage={songsErrorMessage}
      />
    </SafeAreaView>
  );
}
