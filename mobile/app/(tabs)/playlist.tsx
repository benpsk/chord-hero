import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FAB, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  PlaylistSummary,
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  usePlaylists,
  useSharePlaylistMutation,
  useLeavePlaylistMutation,
  useUpdatePlaylistMutation,
} from '@/hooks/usePlaylists';
import { useSongOptions } from '@/hooks/useSongOptions';
import { ApiError, apiPost } from '@/lib/api';
import { PlaylistList } from '@/components/library/PlaylistList';
import { CreatePlaylistFlowModal } from '@/components/library/CreatePlaylistFlowModal';
import { EditPlaylistModal } from '@/components/library/EditPlaylistModal';
import { DeletePlaylistModal } from '@/components/library/DeletePlaylistModal';
import { SharePlaylistModal } from '@/components/library/SharePlaylistModal';

export default function PlaylistScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<'name' | 'songs'>('name');
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdPlaylist, setCreatedPlaylist] = useState<PlaylistSummary | null>(null);

  const [songSearch, setSongSearch] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number | string>>(
    () => new Set<number | string>()
  );
  const [songSubmitError, setSongSubmitError] = useState<string | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<number | string | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState<PlaylistSummary | null>(null);
  const [deleteSubmitError, setDeleteSubmitError] = useState<string | null>(null);

  const [sharingPlaylist, setSharingPlaylist] = useState<PlaylistSummary | null>(null);
  const [shareSearch, setShareSearch] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<{ id: number | string; email: string }[]>([]);
  const [shareSearchLoading, setShareSearchLoading] = useState(false);
  const [shareSearchError, setShareSearchError] = useState<string | null>(null);
  const [shareSubmitError, setShareSubmitError] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const shareModalVisibleRef = useRef(false);
  const shareSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedShareUsers, setSelectedShareUsers] = useState<Map<string, { id: number | string; email: string }>>(() => new Map());

  const [loginPromptVisible, setLoginPromptVisible] = useState(false);

  const playlistsQuery = usePlaylists(isAuthenticated && !isChecking);
  const queryClient = useQueryClient();

  const createPlaylistMutation = useCreatePlaylistMutation();
  const attachSongsMutation = useMutation({
    mutationFn: async ({
      playlistId,
      songIds,
    }: {
      playlistId: number | string;
      songIds: number[];
    }) => {
      return apiPost<{ song_ids: number[]; action: 'add' }, { data?: { message?: string } }>(
        `/api/playlists/${playlistId}/songs`,
        { song_ids: songIds, action: 'add' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-song-options'] });
    },
  });
  const { reset: resetCreatePlaylistMutation } = createPlaylistMutation;
  const { reset: resetAttachSongsMutation } = attachSongsMutation;
  const {
    mutateAsync: updatePlaylistRequest,
    reset: resetUpdatePlaylistMutation,
    isPending: isUpdatingPlaylist,
  } = useUpdatePlaylistMutation();
  const {
    mutateAsync: deletePlaylistRequest,
    reset: resetDeletePlaylistMutation,
    isPending: isDeletingPlaylist,
  } = useDeletePlaylistMutation();
  const {
    mutateAsync: sharePlaylistRequest,
    reset: resetSharePlaylistMutation,
    isPending: isSharingPlaylist,
  } = useSharePlaylistMutation();
  const leavePlaylistMutation = useLeavePlaylistMutation();

  const playlists = useMemo(
    () => playlistsQuery.data?.data ?? [],
    [playlistsQuery.data]
  );
  const isInitialLoading =
    playlistsQuery.isLoading || (playlistsQuery.isFetching && playlists.length === 0);

  const songsQueryEnabled = addModalVisible && modalStep === 'songs';
  const songsQuery = useSongOptions(songSearch, songsQueryEnabled);
  const songOptions = songsQuery.data?.data ?? [];
  const isLoadingSongOptions =
    songsQuery.isLoading || (songsQuery.isFetching && songOptions.length === 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        container: {
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 80,
          gap: 12,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        headingTitle: {
          fontSize: 20,
          fontWeight: '700',
        },
        headerAction: {
          margin: 0,
        },
        fab: {
          backgroundColor: theme.colors.primary,
          position: 'absolute',
          right: 24,
          bottom: 32,
        },
      }),
    [theme.colors.background, theme.colors.primary]
  );

  const previousAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    shareModalVisibleRef.current = shareModalVisible;
  }, [shareModalVisible]);

  useEffect(() => {
    if (previousAuthRef.current && !isAuthenticated) {
      setAddModalVisible(false);
      setModalStep('name');
      setDraftName('');
      setNameError('');
      setSubmitError(null);
      setCreatedPlaylist(null);
      setSongSearch('');
      setSelectedSongIds((prev) => (prev.size === 0 ? prev : new Set<number | string>()));
      setSongSubmitError(null);
      setActiveMenuId(null);
      setEditModalVisible(false);
      setEditingPlaylist(null);
      setEditName('');
      setEditNameError('');
      setEditSubmitError(null);
      setDeleteConfirmVisible(false);
      setDeletingPlaylist(null);
      setDeleteSubmitError(null);
      setShareModalVisible(false);
      setSharingPlaylist(null);
      setShareSearch('');
      setShareSearchResults([]);
      setShareSearchLoading(false);
      setShareSearchError(null);
      setShareSubmitError(null);
      setSelectedShareUsers(new Map<string, { id: number | string; email: string }>());
      resetUpdatePlaylistMutation();
      resetDeletePlaylistMutation();
      resetSharePlaylistMutation();
      leavePlaylistMutation.reset();
      resetCreatePlaylistMutation();
      resetAttachSongsMutation();
    }
    previousAuthRef.current = isAuthenticated;
  }, [
    isAuthenticated,
    resetAttachSongsMutation,
    resetCreatePlaylistMutation,
    resetDeletePlaylistMutation,
    resetSharePlaylistMutation,
    leavePlaylistMutation,
    resetUpdatePlaylistMutation,
  ]);

  const resetModalState = useCallback(() => {
    setAddModalVisible(false);
    setModalStep('name');
    setDraftName('');
    setNameError('');
    setSubmitError(null);
    setCreatedPlaylist(null);
    setSongSearch('');
    setSelectedSongIds(new Set<number | string>());
    setSongSubmitError(null);
    resetCreatePlaylistMutation();
    resetAttachSongsMutation();
  }, [resetAttachSongsMutation, resetCreatePlaylistMutation]);

  const openAddModal = useCallback(() => {
    if (!isAuthenticated) {
      setLoginPromptVisible(true);
      return;
    }
    setAddModalVisible(true);
    setModalStep('name');
    setDraftName('');
    setNameError('');
    setSubmitError(null);
    setCreatedPlaylist(null);
    setSongSearch('');
    setSelectedSongIds(new Set<number | string>());
    setSongSubmitError(null);
    resetCreatePlaylistMutation();
    resetAttachSongsMutation();
  }, [isAuthenticated, resetAttachSongsMutation, resetCreatePlaylistMutation]);

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);


  useEffect(() => {
    if (!addModalVisible || modalStep !== 'songs' || !createdPlaylist) {
      return;
    }
    const options = songsQuery.data?.data ?? [];
    if (!options || options.length === 0) {
      return;
    }
    const playlistId = Number(createdPlaylist.id);
    if (!Number.isFinite(playlistId) || playlistId <= 0) {
      setSelectedSongIds(new Set());
      return;
    }
    const preselected = options
      .filter((song) => (song.playlist_ids ?? []).some((id) => Number(id) === playlistId))
      .map((song) => song.id)
      .filter((id) => id !== undefined && id !== null);
    setSelectedSongIds(new Set(preselected as (number | string)[]));
  }, [addModalVisible, modalStep, createdPlaylist, songsQuery.data]);

  const handleDraftNameChange = useCallback(
    (value: string) => {
      setDraftName(value);
      if (nameError) {
        setNameError('');
      }
      if (submitError) {
        setSubmitError(null);
      }
    },
    [nameError, submitError]
  );

  const handleCreatePlaylist = useCallback(async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError('Playlist name is required');
      return;
    }

    setNameError('');
    setSubmitError(null);
    try {
      const response = await createPlaylistMutation.mutateAsync({ name: trimmed });
      let playlist = response?.data;

      if (!playlist?.id) {
        const refreshed = await playlistsQuery.refetch();
        const refreshedPlaylists = refreshed.data?.data ?? [];
        playlist = refreshedPlaylists.find((item) => {
          if (!item?.name) return false;
          return item.name.trim().toLowerCase() === trimmed.toLowerCase();
        });

        if (!playlist?.id) {
          playlist = refreshedPlaylists.reduce<PlaylistSummary | undefined>((acc, item) => {
            if (!item?.id) return acc;
            const currentId = Number(item.id);
            if (!Number.isFinite(currentId)) {
              return acc;
            }
            if (!acc) {
              return item;
            }
            const accId = Number(acc.id);
            if (!Number.isFinite(accId) || currentId > accId) {
              return item;
            }
            return acc;
          }, playlist);
        }
      }

      if (!playlist?.id) {
        setSubmitError('Playlist created, but we could not confirm its ID. Please try again.');
        return;
      }

      setCreatedPlaylist(playlist);
      setDraftName(playlist.name ?? trimmed);
      setModalStep('songs');
      setSelectedSongIds(new Set<number | string>());
      setSongSearch('');
      setSongSubmitError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Unable to create playlist. Please try again.');
      }
    }
  }, [
createPlaylistMutation, draftName, playlistsQuery]);

  const toggleSongSelection = useCallback((id: number | string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setSongSubmitError(null);
  }, []);

  const isSongSelected = useCallback((id: number | string) => selectedSongIds.has(id), [selectedSongIds]);

  const handleClearSongSelection = useCallback(() => {
    setSelectedSongIds(new Set<number | string>());
    setSongSubmitError(null);
  }, []);

  const handleSongSearchChange = useCallback(
    (value: string) => {
      setSongSearch(value);
      if (songSubmitError) {
        setSongSubmitError(null);
      }
    },
    [songSubmitError]
  );

  const handleAttachSongs = useCallback(async () => {
    if (!createdPlaylist) {
      setSongSubmitError('Playlist not ready yet. Please try again.');
      return;
    }

    if (selectedSongIds.size === 0) {
      setSongSubmitError('Select at least one song to continue.');
      return;
    }

    const playlistId = Number(createdPlaylist.id);
    const songIds = Array.from(selectedSongIds)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!Number.isFinite(playlistId) || playlistId <= 0) {
      setSongSubmitError('Playlist ID is invalid. Please try again.');
      return;
    }

    if (songIds.length === 0) {
      setSongSubmitError('Unable to resolve selected songs. Please try again.');
      return;
    }

    setSongSubmitError(null);
    try {
      await attachSongsMutation.mutateAsync({
        playlistId,
        songIds,
      });
      resetModalState();
    } catch (error) {
      if (error instanceof ApiError) {
        setSongSubmitError(error.message);
      } else {
        setSongSubmitError('Unable to add songs. Please try again.');
      }
    }
  }, [attachSongsMutation, createdPlaylist, resetModalState, selectedSongIds]);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditingPlaylist(null);
    setEditName('');
    setEditNameError('');
    setEditSubmitError(null);
    resetUpdatePlaylistMutation();
  }, [resetUpdatePlaylistMutation]);

  const openEditModal = useCallback(
    (playlist: PlaylistSummary) => {
      setActiveMenuId(null);
      setEditingPlaylist(playlist);
      setEditName(playlist.name ?? '');
      setEditNameError('');
      setEditSubmitError(null);
      setEditModalVisible(true);
    },
    []
  );

  const handleEditNameChange = useCallback((value: string) => {
    setEditName(value);
    if (editNameError) {
      setEditNameError('');
    }
    if (editSubmitError) {
      setEditSubmitError(null);
    }
  }, [editNameError, editSubmitError]);

  const handleUpdatePlaylist = useCallback(async () => {
    if (!editingPlaylist) {
      setEditSubmitError('Playlist not found. Please try again.');
      return;
    }

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditNameError('Playlist name is required');
      return;
    }

    setEditNameError('');
    setEditSubmitError(null);

    try {
      await updatePlaylistRequest({
        playlistId: editingPlaylist.id,
        name: trimmed,
      });
      closeEditModal();
    } catch (error) {
      if (error instanceof ApiError) {
        setEditSubmitError(error.message);
      } else {
        setEditSubmitError('Unable to update playlist. Please try again.');
      }
    }
  }, [closeEditModal, editName, editingPlaylist, updatePlaylistRequest]);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmVisible(false);
    setDeletingPlaylist(null);
    setDeleteSubmitError(null);
    resetDeletePlaylistMutation();
  }, [resetDeletePlaylistMutation]);

  const openDeleteConfirm = useCallback(
    (playlist: PlaylistSummary) => {
      setActiveMenuId(null);
      setDeletingPlaylist(playlist);
      setDeleteSubmitError(null);
      setDeleteConfirmVisible(true);
    },
    []
  );

  const handleDeletePlaylist = useCallback(async () => {
    if (!deletingPlaylist) {
      setDeleteSubmitError('Playlist not found. Please try again.');
      return;
    }

    setDeleteSubmitError(null);
    try {
      await deletePlaylistRequest({
        playlistId: deletingPlaylist.id,
      });
      closeDeleteConfirm();
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteSubmitError(error.message);
      } else {
        setDeleteSubmitError('Unable to delete playlist. Please try again.');
      }
    }
  }, [closeDeleteConfirm, deletePlaylistRequest, deletingPlaylist]);

  const handleLeavePlaylist = useCallback(async (playlist: PlaylistSummary) => {
    if (!playlist?.id) {
      return;
    }
    setActiveMenuId(null);
    try {
      await leavePlaylistMutation.mutateAsync({ playlistId: playlist.id });
    } catch (error) {
      console.error('Failed to leave playlist', error);
    }
  }, [leavePlaylistMutation]);

  const closeShareModal = useCallback(() => {
    setShareModalVisible(false);
    setSharingPlaylist(null);
    setShareSearch('');
    setShareSearchResults([]);
    setShareSearchLoading(false);
    setShareSearchError(null);
    setShareSubmitError(null);
    setSelectedShareUsers(new Map<string, { id: number | string; email: string }>());
    if (shareSearchDebounceRef.current) {
      clearTimeout(shareSearchDebounceRef.current);
      shareSearchDebounceRef.current = null;
    }
    resetSharePlaylistMutation();
  }, [resetSharePlaylistMutation]);

  const openShareModal = useCallback(
    (playlist: PlaylistSummary) => {
      setActiveMenuId(null);
      setSharingPlaylist(playlist);
      const initialSelections = new Map<string, { id: number | string; email: string }>();
      playlist.shared_with?.forEach((user) => {
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
    },
    [resetSharePlaylistMutation]
  );

  const handleShareSearchChange = useCallback((value: string) => {
    setShareSearch(value);
    setShareSearchError(null);
    setShareSubmitError(null);
  }, []);

  const handleShareConfirm = useCallback(async () => {
    if (!sharingPlaylist) {
      return;
    }
    const userIds = Array.from(selectedShareUsers.values()).map((user) => user.id);
    try {
      await sharePlaylistRequest({ playlistId: sharingPlaylist.id, userIds });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      closeShareModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setShareSubmitError(message);
    }
  }, [closeShareModal, queryClient, selectedShareUsers, sharePlaylistRequest, sharingPlaylist]);

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
    setShareSubmitError(null);
  }, []);

  const handleRemoveShareUser = useCallback((userId: number | string) => {
    const key = String(userId);
    setSelectedShareUsers((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    setShareSubmitError(null);
  }, []);

  const shareSearchQuery = useMemo(() => shareSearch.trim(), [shareSearch]);

  useEffect(() => {
    if (!shareModalVisibleRef.current) {
      if (shareSearchDebounceRef.current) {
        clearTimeout(shareSearchDebounceRef.current);
        shareSearchDebounceRef.current = null;
      }
      setShareSearchLoading(false);
      return;
    }

    if (shareSearchDebounceRef.current) {
      clearTimeout(shareSearchDebounceRef.current);
      shareSearchDebounceRef.current = null;
    }

    if (shareSearchQuery.length < 3) {
      setShareSearchLoading(false);
      setShareSearchResults([]);
      setShareSearchError(null);
      return;
    }

    setShareSearchLoading(true);
    setShareSearchError(null);

    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        const response = await apiPost<Record<string, never>, { data?: { id: number | string; email: string }[] }>(
          `/api/users?email=${encodeURIComponent(shareSearchQuery)}`,
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
        if (cancelled) {
          return;
        }
        setShareSearchLoading(false);
        shareSearchDebounceRef.current = null;
      }
    }, 400);

    shareSearchDebounceRef.current = timeout;

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      shareSearchDebounceRef.current = null;
    };
  }, [shareSearchQuery]);

  const selectedShareUsersList = useMemo(
    () => Array.from(selectedShareUsers.values()),
    [selectedShareUsers]
  );

  const isShareUserSelected = useCallback(
    (id: number | string) => selectedShareUsers.has(String(id)),
    [selectedShareUsers]
  );


  const playlistsErrorMessage = playlistsQuery.error instanceof ApiError
    ? playlistsQuery.error.message
    : 'Unable to load playlists right now.';

  const handleOpenPlaylist = useCallback((playlist: PlaylistSummary) => {
    setActiveMenuId(null);
    router.push({
      pathname: '/playlist/[id]',
      params: { id: String(playlist.id), item: JSON.stringify(playlist) },
    });
  }, [router]);

  const handleFabPress = useCallback(() => {
    router.push('/song/create');
  }, [router]);

  const selectedCount = selectedSongIds.size;
  const currentPlaylistName = createdPlaylist?.name ?? draftName.trim();
  const songsErrorMessage =
    songsQuery.error instanceof ApiError
      ? songsQuery.error.message
      : 'Unable to load songs right now.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(360)}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={styles.headerRow} entering={FadeInDown.duration(320)}>
          <Text style={styles.headingTitle}>Your Playlists</Text>
          <IconButton
            icon="playlist-plus"
            size={22}
            onPress={openAddModal}
            style={styles.headerAction}
          />
        </Animated.View>

        <PlaylistList
          playlists={playlists}
          isAuthenticated={isAuthenticated}
          isChecking={isChecking}
          isInitialLoading={isInitialLoading}
          isError={Boolean(playlistsQuery.isError)}
          errorMessage={playlistsErrorMessage}
          onRetry={playlistsQuery.refetch}
          onNavigateToLogin={handleNavigateToLogin}
          onCreatePlaylist={openAddModal}
          onOpen={handleOpenPlaylist}
          onShare={openShareModal}
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
          onLeave={handleLeavePlaylist}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
        />
      </Animated.ScrollView>

      <FAB
        size="small"
        icon="compass"
        style={styles.fab}
        onPress={handleFabPress}
        color="white"
      />

      <Portal>
        <CreatePlaylistFlowModal
          visible={addModalVisible}
          step={modalStep}
          draftName={draftName}
          nameError={nameError}
          submitError={submitError}
          onChangeDraftName={handleDraftNameChange}
          onSubmitName={handleCreatePlaylist}
          onCancel={resetModalState}
          isCreating={createPlaylistMutation.isPending}
          songSearch={songSearch}
          onChangeSongSearch={handleSongSearchChange}
          isSongQueryFetching={songsQuery.isFetching}
          isLoadingSongOptions={isLoadingSongOptions}
          songOptions={songOptions}
          selectedCount={selectedCount}
          onToggleSong={toggleSongSelection}
          isSongSelected={isSongSelected}
          onClearSelection={handleClearSongSelection}
          songSubmitError={songSubmitError}
          onSubmitSongs={handleAttachSongs}
          isSubmittingSongs={attachSongsMutation.isPending}
          currentPlaylistName={currentPlaylistName}
          songsErrorMessage={songsErrorMessage}
        />

        <EditPlaylistModal
          visible={editModalVisible}
          value={editName}
          nameError={editNameError}
          submitError={editSubmitError}
          onChange={handleEditNameChange}
          onDismiss={closeEditModal}
          onSubmit={handleUpdatePlaylist}
          loading={isUpdatingPlaylist}
        />

        <SharePlaylistModal
          visible={shareModalVisible}
          playlistName={sharingPlaylist?.name}
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
          onDismiss={closeShareModal}
          onConfirm={handleShareConfirm}
        />

        <DeletePlaylistModal
          visible={deleteConfirmVisible}
          playlistName={deletingPlaylist?.name}
          errorMessage={deleteSubmitError}
          loading={isDeletingPlaylist}
          onDismiss={closeDeleteConfirm}
          onConfirm={handleDeletePlaylist}
        />
      </Portal>

      <LoginRequiredDialog
        visible={loginPromptVisible}
        onDismiss={handleDismissLoginPrompt}
        onLogin={handleNavigateToLogin}
      />
    </SafeAreaView>
  );
}
