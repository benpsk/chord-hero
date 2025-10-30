import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Button, IconButton, Modal, Portal, Surface, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TrackList } from '@/components/search/TrackList';
import type { SongRecord } from '@/hooks/useSongsSearch';
import { useAlbumSongs } from '@/hooks/useAlbumSongs';
import { PlaylistSelectionModal } from '@/components/search/PlaylistSelectionModal';
import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';
import { useAuth } from '@/hooks/useAuth';
import { TrendingAlbumItem } from '@/components/home/TrendingAlbumsSection';
import { usePlaylists } from '@/hooks/usePlaylists';
import { apiPost } from '@/lib/api';

export default function AlbumDetailScreen() {
  const { id, item } = useLocalSearchParams<{
    id: string;
    item: string;
  }>();

  const albumIdParam = Array.isArray(id) ? id[0] : id;
  const albumItemParam = Array.isArray(item) ? item[0] : item;

  const album = useMemo<TrendingAlbumItem | undefined>(() => {
    if (!albumItemParam) return undefined;
    try {
      const parsed = JSON.parse(albumItemParam) as TrendingAlbumItem;
      return {
        ...parsed,
        artists: parsed.artists ?? [],
        writers: parsed.writers ?? [],
      };
    } catch {
      return undefined;
    }
  }, [albumItemParam]);

  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [trackPlaylistMap, setTrackPlaylistMap] = useState<Record<string, string[]>>({});
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [activeTrack, setActiveTrack] = useState<SongRecord | null>(null);
  const [draftSelectedPlaylists, setDraftSelectedPlaylists] = useState<Set<string>>(() => new Set());
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [isSavingPlaylists, setIsSavingPlaylists] = useState(false);

  const albumId = useMemo(() => {
    if (!albumIdParam) return undefined;
    const parsed = Number(albumIdParam);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [albumIdParam]);

  const { data: albumSongsResponse, isLoading: isAlbumLoading } = useAlbumSongs(albumId);
  const playlistsQuery = usePlaylists(isAuthenticated);
  const queryClient = useQueryClient();
  const attachSongsMutation = useMutation({
    mutationFn: async ({
      songId,
      playlistIds,
    }: {
      songId: number;
      playlistIds: number[];
    }) =>
      apiPost<{ playlist_ids: number[] }, { data?: { message?: string } }>(
        `/api/songs/${songId}/playlists`,
        { playlist_ids: playlistIds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-song-options'] });
    },
  });

  const songs = useMemo(() => albumSongsResponse?.data ?? [], [albumSongsResponse]);
  const playlists = useMemo(
    () =>
      playlistsQuery.data?.data?.map((playlist) => ({
        id: String(playlist.id),
        name: playlist.name,
      })) ?? [],
    [playlistsQuery.data]
  );

  useEffect(() => {
    const source = albumSongsResponse?.data;
    if (!source) {
      setTrackPlaylistMap({});
      setBookmarkedItems(new Set());
      return;
    }

    const nextMap: Record<string, string[]> = {};
    const nextBookmarks = new Set<string>();

    source.forEach((song) => {
      const playlistIds = song.playlist_ids ?? [];
      if (playlistIds.length === 0) {
        return;
      }
      const normalized = playlistIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString());
      if (normalized.length === 0) {
        return;
      }
      const key = `track-${song.id}`;
      nextMap[key] = normalized;
      nextBookmarks.add(key);
    });

    setTrackPlaylistMap(nextMap);
    setBookmarkedItems(nextBookmarks);
  }, [albumSongsResponse?.data]);
  const albumName = album?.name ?? 'Album';
  const trackCountLabel = useMemo(() => {
    if (typeof album?.total === 'number' && album.total >= 0) {
      return `${album.total} ${album.total === 1 ? 'track' : 'tracks'}`;
    }
    return '0 tracks';
  }, [album?.total]);
  const headerMeta = useMemo(() => {
    const pieces: string[] = [];
    if (trackCountLabel) {
      pieces.push(trackCountLabel);
    }
    if (album?.releaseYear) {
      pieces.push(String(album.releaseYear));
    }
    return pieces.join(' · ');
  }, [album?.releaseYear, trackCountLabel]);
  const artistButtons = album?.artists ?? [];
  const writerButtons = album?.writers ?? [];

  const handleChangeSearchQuery = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleClearSearchQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleClosePlaylistModal = useCallback(() => {
    setPlaylistModalVisible(false);
    setActiveTrack(null);
    setDraftSelectedPlaylists(() => new Set());
    setIsSavingPlaylists(false);
  }, []);

  const handleOpenPlaylistModal = useCallback(
    (track: SongRecord) => {
      if (!isAuthenticated) {
        setLoginPromptVisible(true);
        return;
      }
      const trackKey = `track-${track.id}`;
      const existingSelections = trackPlaylistMap[trackKey] ?? [];
      setDraftSelectedPlaylists(() => new Set(existingSelections));
      setActiveTrack(track);
      setPlaylistModalVisible(true);
    },
    [isAuthenticated, trackPlaylistMap]
  );

  const handleTogglePlaylistSelection = useCallback((playlistId: string) => {
    setDraftSelectedPlaylists((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  }, []);

  const handleConfirmPlaylists = useCallback(async () => {
    if (!activeTrack) {
      handleClosePlaylistModal();
      return;
    }

    const trackKey = `track-${activeTrack.id}`;
    const selectedArray = Array.from(draftSelectedPlaylists);
    const playlistIds = selectedArray
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    const normalizedPlaylistIds = playlistIds.map((value) => value.toString());

    try {
      setIsSavingPlaylists(true);
      await attachSongsMutation.mutateAsync({
        songId: activeTrack.id,
        playlistIds,
      });

      setTrackPlaylistMap((prev) => {
        const next = { ...prev };
        if (normalizedPlaylistIds.length > 0) {
          next[trackKey] = normalizedPlaylistIds;
        } else {
          delete next[trackKey];
        }
        return next;
      });

      setBookmarkedItems((prev) => {
        const next = new Set(prev);
        if (normalizedPlaylistIds.length > 0) {
          next.add(trackKey);
        } else {
          next.delete(trackKey);
        }
        return next;
      });

      handleClosePlaylistModal();
    } catch (error) {
      console.error('Failed to add album song to playlists', error);
    } finally {
      setIsSavingPlaylists(false);
    }
  }, [
    activeTrack,
    attachSongsMutation,
    draftSelectedPlaylists,
    handleClosePlaylistModal,
  ]);

  const handleTrackPress = useCallback(
    (track: SongRecord) => {
      router.push({ pathname: '/song/[id]', params: { id: String(track.id), item: JSON.stringify(track) } });
    },
    [router]
  );

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);

  const handleOpenInfo = useCallback(() => {
    setInfoVisible(true);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setInfoVisible(false);
  }, []);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return songs;
    }

    return songs.filter((track) => {
      const titleMatch = track.title?.toLowerCase().includes(normalizedQuery);
      const artistMatch =
        track.artists?.some((item) => (item?.name ?? '').toLowerCase().includes(normalizedQuery)) ?? false;
      return titleMatch || artistMatch;
    });
  }, [songs, searchQuery]);

  // const playTimes = album.totalPlays + " times";

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
          paddingTop: 16,
          gap: 24,
        },
        headerRow: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        coverCard: {
          height: 60,
          width: 60,
          borderRadius: 20,
          padding: 14,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        },
        coverSubtitle: {
          fontWeight: '700',
          textAlign: 'center',
          color: theme.colors.tertiary,
        },
        headerInfo: {
          flex: 1,
          gap: 4,
        },
        headingText: {
          fontSize: 20,
          fontWeight: '600',
          color: theme.colors.onSurface,
        },
        metaText: {
          color: theme.colors.onSurfaceVariant,
          fontSize: 12,
        },
        searchRow: {
          zIndex: 20,
        },
        searchInput: {},
        section: {
          gap: 16,
          zIndex: 1,
        },
        trackListContent: {
          paddingBottom: 12,
        },
        loadingContainer: {
          paddingVertical: 48,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emptyState: {
          alignItems: 'center',
          paddingVertical: 60,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
        modalContainer: {
          marginHorizontal: 24,
          borderRadius: 16,
          padding: 20,
          backgroundColor: theme.colors.surface,
        },
        modalTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: theme.colors.onSurface,
          marginBottom: 8,
        },
        modalSubtitle: {
          color: theme.colors.onSurfaceVariant,
          marginBottom: 16,
        },
        modalSection: {
          marginBottom: 16,
          gap: 8,
        },
        modalLabel: {
          fontWeight: '600',
          color: theme.colors.onSurface,
        },
        modalValue: {
          color: theme.colors.onSurfaceVariant,
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        chipButton: {
          borderRadius: 999,
        },
        closeButton: {
          marginTop: 8,
        },
      }),
    [
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.tertiary,
      theme.colors.surface,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: albumName,
          headerRight: () => (
            <IconButton
              icon="help-circle-outline"
              size={22}
              onPress={handleOpenInfo}
              accessibilityLabel="Album info"
            />
          ),
        }}
      />
      <Animated.ScrollView
        entering={FadeInUp.duration(360)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.headerRow} entering={FadeInUp.delay(80).duration(320)}>
          <Surface style={styles.coverCard} elevation={2}>
            <Text style={styles.coverSubtitle}>{albumName.slice(0, 2).toUpperCase()}</Text>
          </Surface>
          <View style={styles.headerInfo}>
            <Text style={styles.headingText} numberOfLines={1}>
              {albumName}
            </Text>
            {headerMeta ? <Text style={styles.metaText}>{headerMeta}</Text> : null}
          </View>
        </Animated.View>

        <Animated.View style={styles.searchRow} entering={FadeInUp.delay(120).duration(320)}>
          <TextInput
            mode="outlined"
            value={searchQuery}
            placeholder="Search tracks"
            onChangeText={handleChangeSearchQuery}
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchQuery
                ? <TextInput.Icon icon="close-circle" onPress={handleClearSearchQuery} forceTextInputFocus={false} />
                : undefined
            }
            style={styles.searchInput}
            dense
          />
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeInUp.delay(200).duration(340)}>
          {isAlbumLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating size="small" />
            </View>
          ) : (
            <TrackList
              tracks={filteredSongs}
              bookmarkedItems={bookmarkedItems}
              onPressBookmark={handleOpenPlaylistModal}
              onPressTrack={handleTrackPress}
              contentContainerStyle={styles.trackListContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No tracks available yet.</Text>
                </View>
              )}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      </Animated.ScrollView>
      <PlaylistSelectionModal
        visible={isPlaylistModalVisible}
        trackTitle={activeTrack?.title}
        playlists={playlists}
        selectedIds={draftSelectedPlaylists}
        onTogglePlaylist={handleTogglePlaylistSelection}
        onConfirm={handleConfirmPlaylists}
        onCancel={handleClosePlaylistModal}
        confirmDisabled={isSavingPlaylists}
        confirmLoading={isSavingPlaylists}
      />
      <LoginRequiredDialog
        visible={loginPromptVisible}
        onDismiss={handleDismissLoginPrompt}
        onLogin={handleNavigateToLogin}
      />
      <Portal>
        <Modal visible={infoVisible} onDismiss={handleCloseInfo} contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>{albumName}</Text>
          <Text style={styles.modalSubtitle}>{headerMeta || 'Album details unavailable'}</Text>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Artists</Text>
            {artistButtons.length > 0 ? (
              <View style={styles.chipRow}>
                {artistButtons.map((artist) => (
                  <Button
                    key={`artist-${artist.id}`}
                    mode="outlined"
                    compact
                    style={styles.chipButton}
                    onPress={() => {}}
                  >
                    {artist.name}
                  </Button>
                ))}
              </View>
            ) : (
              <Text style={styles.modalValue}>No artists listed</Text>
            )}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Writers</Text>
            {writerButtons.length > 0 ? (
              <View style={styles.chipRow}>
                {writerButtons.map((writer) => (
                  <Button
                    key={`writer-${writer.id}`}
                    mode="outlined"
                    compact
                    style={styles.chipButton}
                    onPress={() => {}}
                  >
                    {writer.name}
                  </Button>
                ))}
              </View>
            ) : (
              <Text style={styles.modalValue}>No writers listed</Text>
            )}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Total tracks</Text>
            <Text style={styles.modalValue}>{trackCountLabel}</Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Release year</Text>
            <Text style={styles.modalValue}>{album?.releaseYear ?? 'Unknown'}</Text>
          </View>

          <Button mode="contained" onPress={handleCloseInfo} style={styles.closeButton}>
            Close
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}
