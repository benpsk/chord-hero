import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Divider,
  FAB,
  HelperText,
  IconButton,
  List,
  Modal,
  Portal,
  Searchbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  PlaylistSummary,
  useAttachSongsToPlaylistMutation,
  useCreatePlaylistMutation,
  usePlaylists,
} from '@/hooks/usePlaylists';
import { useSongOptions } from '@/hooks/useSongOptions';
import { ApiError } from '@/lib/api';

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const [modalStep, setModalStep] = useState<'name' | 'songs'>('name');
  const [createdPlaylist, setCreatedPlaylist] = useState<PlaylistSummary | null>(null);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number | string>>(
    () => new Set<number | string>()
  );
  const [songSubmitError, setSongSubmitError] = useState<string | null>(null);

  const playlistsQuery = usePlaylists(isAuthenticated && !isChecking);
  const createPlaylistMutation = useCreatePlaylistMutation();
  const attachSongsMutation = useAttachSongsToPlaylistMutation();
  const refetchPlaylists = playlistsQuery.refetch;

  const playlists = playlistsQuery.data?.data ?? [];
  const isInitialLoading =
    playlistsQuery.isLoading || (playlistsQuery.isFetching && playlists.length === 0);
  const isCreating = createPlaylistMutation.isPending;
  const isAttachingSongs = attachSongsMutation.isPending;
  const songQueryEnabled = addModalVisible && modalStep === 'songs';
  const songsQuery = useSongOptions(songSearch, songQueryEnabled);
  const songOptions = songsQuery.data?.data ?? [];
  const isLoadingSongOptions =
    songsQuery.isLoading || (songsQuery.isFetching && songOptions.length === 0);

  useEffect(() => {
    if (!isAuthenticated) {
      setAddModalVisible(false);
      setDraftName('');
      setNameError('');
      setSubmitError(null);
      setModalStep('name');
      setCreatedPlaylist(null);
      setSongSearch('');
      setSelectedSongIds(new Set<number | string>());
      setSongSubmitError(null);
    }
  }, [isAuthenticated]);

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
        libraryRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        rowSpacing: {
          height: 12,
        },
        artwork: {
          backgroundColor: theme.colors.tertiary,
          width: 52,
          height: 52,
          borderRadius: 12,
        },
        libraryInfo: {
          flex: 1,
          marginLeft: 16,
          gap: 6,
        },
        libraryTitle: {
          fontWeight: '700',
        },
        librarySubtitle: {
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
        },
        chevronButton: {
          margin: 0,
        },
        inlineDivider: {
          marginTop: 12,
        },
        emptyState: {
          alignItems: 'center',
          paddingVertical: 120,
          gap: 12,
          paddingHorizontal: 24,
        },
        emptyTitle: {
          fontSize: 16,
          fontWeight: '700',
        },
        emptySubtitle: {
          fontSize: 12,
          textAlign: 'center',
        },
        fab: {
          backgroundColor: theme.colors.primary,
          position: 'absolute',
          right: 24,
          bottom: 32,
        },
        modalContainer: {
          marginHorizontal: 24,
          backgroundColor: theme.colors.surface,
          padding: 24,
          borderRadius: 24,
          gap: 24,
        },
        modalHeader: {
          gap: 4,
        },
        modalTitle: {
          fontSize: 16,
          fontWeight: '700',
        },
        modalSubtitle: {
          fontSize: 12,
          marginBottom: 12,
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 12,
        },
        songList: {
          maxHeight: 360,
          marginTop: 12,
        },
        songListItem: {
          paddingHorizontal: 0,
        },
        songListTitle: {
          fontWeight: '600',
        },
        songListDescription: {
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
        },
        songStepSummary: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
        },
        selectionCounter: {
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
        },
        authRequired: {
          flex: 1,
          alignItems: 'center',
          gap: 16,
          paddingHorizontal: 24,
          paddingTop: 120,
        },
        authTitle: {
          fontSize: 20,
          fontWeight: '700',
          textAlign: 'center',
        },
        authSubtitle: {
          fontSize: 14,
          textAlign: 'center',
          color: theme.colors.onSurfaceVariant,
        },
        loadingState: {
          alignItems: 'center',
          gap: 12,
          paddingVertical: 120,
        },
        loadingText: {
          fontSize: 13,
          color: theme.colors.onSurfaceVariant,
        },
        errorState: {
          alignItems: 'center',
          gap: 12,
          paddingVertical: 120,
          paddingHorizontal: 24,
        },
        errorTitle: {
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
        },
        errorMessage: {
          fontSize: 13,
          textAlign: 'center',
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [
      theme.colors.tertiary,
      theme.colors.background,
      theme.colors.primary,
      theme.colors.surface,
      theme.colors.onSurfaceVariant,
    ]
  );

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
    createPlaylistMutation.reset();
    attachSongsMutation.reset();
  }, [attachSongsMutation, createPlaylistMutation]);

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
    createPlaylistMutation.reset();
    attachSongsMutation.reset();
  }, [attachSongsMutation, createPlaylistMutation, isAuthenticated]);

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
        const refreshed = await refetchPlaylists();
        const refreshedPlaylists = refreshed.data?.data ?? [];
        playlist = refreshedPlaylists.find((item) => {
          if (!item?.name) return false;
          return item.name.trim().toLowerCase() === trimmed.toLowerCase();
        });

        if (!playlist?.id) {
          playlist = refreshedPlaylists.reduce<PlaylistSummary | null>((acc, item) => {
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
          }, null);
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
  }, [createPlaylistMutation, draftName, refetchPlaylists]);

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

  const handleFabPress = useCallback(() => {
    if (!isAuthenticated) {
      setLoginPromptVisible(true);
      return;
    }
    router.push('/song/create');
  }, [isAuthenticated, router]);

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);

  const libraryContent = useMemo(() => {
    if (!isAuthenticated) {
      return (
        <Animated.View style={styles.authRequired} entering={FadeInUp.delay(100).duration(320)}>
          <Text style={styles.authTitle}>Sign in to manage your playlists</Text>
          <Text style={styles.authSubtitle}>
            Create custom song collections, organize set lists, and sync them across your devices once you log in.
          </Text>
          <Button mode="contained" onPress={() => router.push('/login')}>
            Go to login
          </Button>
        </Animated.View>
      );
    }

    if (isChecking || isInitialLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator animating size="small" />
          <Text style={styles.loadingText}>
            {isChecking ? 'Checking your account…' : 'Loading your playlists…'}
          </Text>
        </View>
      );
    }

    if (playlistsQuery.isError) {
      const message =
        playlistsQuery.error instanceof ApiError
          ? playlistsQuery.error.message
          : 'Unable to load playlists right now.';

      return (
        <Animated.View style={styles.errorState} entering={FadeInUp.delay(120).duration(360)}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          <Button mode="contained" icon="reload" onPress={playlistsQuery.refetch}>
            Try again
          </Button>
        </Animated.View>
      );
    }

    if (playlists.length === 0) {
      return (
        <Animated.View style={styles.emptyState} entering={FadeInUp.delay(120).duration(360)}>
          <Text style={styles.emptyTitle}>No playlists yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a playlist to organize songs for your next performance or study session.
          </Text>
          <Button mode="contained" icon="playlist-plus" onPress={openAddModal}>
            Create a playlist
          </Button>
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeInUp.delay(140).duration(360)}>
        {playlists.map((playlist, index) => (
          <TouchableRipple key={playlist.id} onPress={() => {}} borderless={false}>
            <Animated.View entering={FadeInUp.delay(160 + index * 40).duration(320)}>
              {index > 0 && <View style={styles.rowSpacing} />}
              <View style={styles.libraryRow}>
                <View style={styles.artwork} />
                <View style={styles.libraryInfo}>
                  <Text style={styles.libraryTitle}>{playlist.name}</Text>
                  <Text style={styles.librarySubtitle}>
                    {playlist.total} song{playlist.total === 1 ? '' : 's'}
                  </Text>
                </View>
                <IconButton
                  icon="chevron-right"
                  size={22}
                  style={styles.chevronButton}
                  onPress={() => {}}
                />
              </View>
              {index < playlists.length - 1 && <Divider style={styles.inlineDivider} />}
            </Animated.View>
          </TouchableRipple>
        ))}
      </Animated.View>
    );
  }, [
    isAuthenticated,
    isChecking,
    isInitialLoading,
    playlistsQuery.isError,
    playlistsQuery.error,
    playlistsQuery.refetch,
    playlists,
    openAddModal,
    router,
    styles,
  ]);

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
          <Text style={styles.headingTitle}>Your Library</Text>
          <IconButton
            icon="playlist-plus"
            size={22}
            onPress={openAddModal}
            style={styles.headerAction}
          />
        </Animated.View>

        {libraryContent}
      </Animated.ScrollView>

      <FAB
        size="small"
        icon="compass"
        style={styles.fab}
        onPress={handleFabPress}
        color="white"
      />

      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={resetModalState}
          contentContainerStyle={styles.modalContainer}
        >
          {modalStep === 'name' ? (
            <View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New playlist</Text>
                <Text style={styles.modalSubtitle}>
                  Give your playlist a clear name. We&apos;ll help you add songs next.
                </Text>
              </View>
              <TextInput
                label="Playlist name"
                mode="outlined"
                value={draftName}
                onChangeText={(value) => {
                  setDraftName(value);
                  if (nameError) {
                    setNameError('');
                  }
                  if (submitError) {
                    setSubmitError(null);
                  }
                }}
                error={Boolean(nameError || submitError)}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreatePlaylist}
              />
              {nameError ? (
                <HelperText type="error">{nameError}</HelperText>
              ) : submitError ? (
                <HelperText type="error">{submitError}</HelperText>
              ) : (
                <HelperText type="info">Keep it short and descriptive.</HelperText>
              )}
              <View style={styles.modalActions}>
                <Button onPress={resetModalState} disabled={isCreating}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreatePlaylist}
                  loading={isCreating}
                  disabled={isCreating}
                >
                  Continue
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add songs</Text>
                <Text style={styles.modalSubtitle}>
                  Select songs to include in “{currentPlaylistName}”. You can revisit this later.
                </Text>
              </View>
              <Searchbar
                placeholder="Search songs"
                value={songSearch}
                onChangeText={(value) => {
                  setSongSearch(value);
                  if (songSubmitError) {
                    setSongSubmitError(null);
                  }
                }}
                autoCorrect={false}
                autoCapitalize="none"
                loading={songsQuery.isFetching}
              />
              {songsQuery.isError ? (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
                  <Text style={styles.errorMessage}>{songsErrorMessage}</Text>
                  <Button mode="outlined" onPress={songsQuery.refetch}>
                    Retry
                  </Button>
                </View>
              ) : isLoadingSongOptions ? (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
                  <ActivityIndicator animating size="small" />
                  <Text style={styles.loadingText}>Loading songs…</Text>
                </View>
              ) : songOptions.length === 0 ? (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
                  <Text style={styles.emptyTitle}>No songs found</Text>
                  <Text style={styles.emptySubtitle}>Try adjusting your search.</Text>
                </View>
              ) : (
                <ScrollView style={styles.songList} keyboardShouldPersistTaps="handled">
                  {songOptions.map((song, index) => {
                    const checked = selectedSongIds.has(song.id);
                    const artistLabel = Array.isArray(song.artists)
                      ? song.artists
                          .map((artist) => artist?.name)
                          .filter(Boolean)
                          .join(', ')
                      : undefined;
                    return (
                      <View key={song.id}>
                        <List.Item
                          title={song.title}
                          description={artistLabel}
                          onPress={() => toggleSongSelection(song.id)}
                          right={() => (
                            <Checkbox
                              status={checked ? 'checked' : 'unchecked'}
                              onPress={() => toggleSongSelection(song.id)}
                            />
                          )}
                          style={styles.songListItem}
                          titleStyle={styles.songListTitle}
                          descriptionStyle={styles.songListDescription}
                        />
                        {index < songOptions.length - 1 && <Divider />}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.songStepSummary}>
                <Text style={styles.selectionCounter}>
                  {selectedCount} selected
                </Text>
                {selectedCount > 0 ? (
                  <Button
                    compact
                    onPress={() => {
                      setSelectedSongIds(new Set<number | string>());
                      setSongSubmitError(null);
                    }}
                    disabled={isAttachingSongs}
                  >
                    Clear
                  </Button>
                ) : null}
              </View>
              {songSubmitError ? (
                <HelperText type="error" visible>
                  {songSubmitError}
                </HelperText>
              ) : null}
              <View style={styles.modalActions}>
                <Button onPress={resetModalState} disabled={isAttachingSongs}>
                  Skip for now
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAttachSongs}
                  loading={isAttachingSongs}
                  disabled={isAttachingSongs || selectedCount === 0}
                >
                  Add songs
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>

      <LoginRequiredDialog
        visible={loginPromptVisible}
        onDismiss={handleDismissLoginPrompt}
        onLogin={handleNavigateToLogin}
      />
    </SafeAreaView>
  );
}
