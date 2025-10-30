import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Divider, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TrackList } from '@/components/search/TrackList';
import { Album, type SearchAlbumItem } from '@/components/search/Album';
import { Stat, type SearchStatItem } from '@/components/search/Stat';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { PlaylistSelectionModal } from '@/components/search/PlaylistSelectionModal';
import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';
import { type FilterLanguage } from '@/constants/home';
import { SongRecord, useSongsSearch } from '@/hooks/useSongsSearch';
import { AlbumRecord, useAlbumsSearch } from '@/hooks/useAlbumsSearch';
import { ArtistRecord, useArtistsSearch } from '@/hooks/useArtistsSearch';
import { useWritersSearch, WriterRecord } from '@/hooks/useWritersSearch';
import { ReleaseYearRecord, useReleaseYearsSearch } from '@/hooks/useReleaseYearsSearch';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylists } from '@/hooks/usePlaylists';
import ListHeader from '@/components/search/ListHeader';
import ListFooter from '@/components/search/ListFooter';
import { apiPost } from '@/lib/api';
import type { WriterPreview } from '@/app/writer/[id]';
import type { ReleaseYearPreview } from '@/app/release-year/[id]';
import type { TrendingAlbumItem } from '@/components/home/TrendingAlbumsSection';
import type { PopularArtistItem } from '@/components/home/PopularArtistsSection';

type SearchTabKey = 'tracks' | 'myTracks' | 'albums' | 'artists' | 'writers' | 'releaseYears';

function extractPageData<T>(page: unknown): T[] {
  if (!page) return [];
  if (Array.isArray(page)) {
    return page as T[];
  }
  const data = (page as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as T[];
  }
  return [];
}
export default function SearchScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<FilterLanguage[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [trackPlaylistMap, setTrackPlaylistMap] = useState<Record<string, string[]>>({});
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [activeTrack, setActiveTrack] = useState<SongRecord | null>(null);
  const [draftSelectedPlaylists, setDraftSelectedPlaylists] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<SearchTabKey>('tracks');
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const [isSavingPlaylists, setIsSavingPlaylists] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const trimmedQuery = query.trim();

  const {
    data: songsPages,
    fetchNextPage: fetchNextSongs,
    hasNextPage: hasNextSongs,
    isFetchingNextPage: isFetchingNextSongs,
  } = useSongsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: myTracksPages,
    fetchNextPage: fetchNextMyTracks,
    hasNextPage: hasNextMyTracks,
    isFetchingNextPage: isFetchingNextMyTracks,
  } = useSongsSearch(
    trimmedQuery ? { search: trimmedQuery, userId: 1 } : { userId: 1 },
    { enabled: activeTab === 'myTracks' }
  );
  const {
    data: albumsPages,
    fetchNextPage: fetchNextAlbums,
    hasNextPage: hasNextAlbums,
    isFetchingNextPage: isFetchingNextAlbums,
  } = useAlbumsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: artistsPages,
    fetchNextPage: fetchNextArtists,
    hasNextPage: hasNextArtists,
    isFetchingNextPage: isFetchingNextArtists,
  } = useArtistsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: writersPages,
    fetchNextPage: fetchNextWriters,
    hasNextPage: hasNextWriters,
    isFetchingNextPage: isFetchingNextWriters,
  } = useWritersSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: releaseYearsPages,
    fetchNextPage: fetchNextReleaseYears,
    hasNextPage: hasNextReleaseYears,
    isFetchingNextPage: isFetchingNextReleaseYears,
  } = useReleaseYearsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        content: {
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          marginBottom: tabBarHeight + insets.bottom + 8,
        },
        headingGroup: {
          gap: 4,
        },
        loadingMore: {
          paddingVertical: 16,
        },
        trackCard: {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.tertiary,
        },
        loadingText: {
          textAlign: 'center',
        },
      }),
    [theme.colors.background, theme.colors.tertiary, tabBarHeight, insets.bottom]
  );

  const songsRecords = useMemo(
    () => songsPages?.pages.flatMap((page) => extractPageData<SongRecord>(page)) ?? [],
    [songsPages]
  );
  const myTrackRecords = useMemo(
    () => myTracksPages?.pages.flatMap((page) => extractPageData<SongRecord>(page)) ?? [],
    [myTracksPages]
  );
  const albumRecords = useMemo(
    () => albumsPages?.pages.flatMap((page) => extractPageData<AlbumRecord>(page)) ?? [],
    [albumsPages]
  );
  const artistRecords = useMemo(
    () => artistsPages?.pages.flatMap((page) => extractPageData<ArtistRecord>(page)) ?? [],
    [artistsPages]
  );
  const writerRecords = useMemo(
    () => writersPages?.pages.flatMap((page) => extractPageData<WriterRecord>(page)) ?? [],
    [writersPages]
  );
  const releaseYearRecords = useMemo(
    () => releaseYearsPages?.pages.flatMap((page) => extractPageData<ReleaseYearRecord>(page)) ?? [],
    [releaseYearsPages]
  );

  const albumItems = useMemo<SearchAlbumItem[]>(() => {
    if (albumRecords.length === 0) return [];
    return albumRecords
      .filter((album) => album && album.id != null && album.name)
      .map((album) => ({
        id: String(album.id),
        title: album.name,
        artist:
          album.artists?.map((artist) => artist?.name).filter(Boolean).join(', ') || 'Unknown artist',
        trackCount: typeof album.total === 'number' && album.total != null ? album.total : 0,
        releaseYear: album.release_year ?? null,
        artistDetails: album.artists?.map((artist) => ({
          id: artist?.id ?? '',
          name: artist?.name ?? null,
        })),
        writerDetails: album.writers?.map((writer) => ({
          id: writer?.id ?? '',
          name: writer?.name ?? null,
        })),
      }));
  }, [albumRecords]);

  const artistItems = useMemo<SearchStatItem[]>(() => {
    if (artistRecords.length === 0) return [];
    return artistRecords
      .filter((artist) => artist && artist.id != null && artist.name)
      .map((artist) => ({
        id: String(artist.id),
        name: artist.name,
        total: typeof artist.total === 'number' && artist.total != null ? artist.total : 0,
      }));
  }, [artistRecords]);
  const writerItems = useMemo<SearchStatItem[]>(() => {
    if (writerRecords.length === 0) return [];
    return writerRecords
      .filter((writer) => writer && writer.id != null && writer.name)
      .map((writer) => ({
        id: String(writer.id),
        name: writer.name,
        total: typeof writer.total === 'number' && writer.total != null ? writer.total : 0,
      }));
  }, [writerRecords]);
  const releaseYearItems = useMemo<SearchStatItem[]>(() => {
    if (releaseYearRecords.length === 0) return [];
    return releaseYearRecords
      .filter((year) => year && year.id != null && year.name)
      .map((year) => ({
        id: String(year.id),
        name: String(year.name ?? year.id),
        total: typeof year.total === 'number' && year.total != null ? year.total : 0,
      }));
  }, [releaseYearRecords]);
  const playlists = useMemo(
    () =>
      playlistsQuery.data?.data?.map((playlist) => ({
        id: String(playlist.id),
        name: playlist.name,
      })) ?? [],
    [playlistsQuery.data]
  );
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
      console.error('Failed to add song to playlists', error);
    } finally {
      setIsSavingPlaylists(false);
    }
  }, [
    activeTrack,
    attachSongsMutation,
    draftSelectedPlaylists,
    handleClosePlaylistModal,
  ]);

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);

  const handleTrackPress = useCallback(
    (track: SongRecord) => {
      router.push({ pathname: '/song/[id]', params: { id: track.id, item: JSON.stringify(track)} });
    },
    [router]
  );

  const handleAlbumPress = useCallback(
    (album: SearchAlbumItem) => {
      const normalizeContributors = (
        people?: { id: number | string; name: string | null }[]
      ) =>
        (people ?? [])
          .map((person) => {
            const id = Number(person?.id);
            if (!Number.isFinite(id) || id <= 0) {
              return null;
            }
            const name = person?.name ?? '';
            if (!name) {
              return null;
            }
            return { id, name };
          })
          .filter(
            (person): person is { id: number; name: string } =>
              person != null && typeof person.id === 'number' && !!person.name
          );

      const payload: TrendingAlbumItem = {
        id: album.id,
        name: album.title,
        total: album.trackCount,
        releaseYear: album.releaseYear ?? undefined,
        artistNames: album.artist,
        artists: normalizeContributors(album.artistDetails),
        writers: normalizeContributors(album.writerDetails),
      };

      router.push({
        pathname: '/album/[id]',
        params: {
          id: album.id,
          item: JSON.stringify(payload),
        },
      });
    },
    [router]
  );

  const handleArtistPress = useCallback(
    (artist: SearchStatItem) => {
      const payload: PopularArtistItem = {
        id: artist.id,
        name: artist.name,
      };

      router.push({
        pathname: '/artist/[id]',
        params: {
          id: artist.id,
          item: JSON.stringify(payload),
        },
      });
    },
    [router]
  );

  const handleWriterPress = useCallback(
    (writer: SearchStatItem) => {
      const payload: WriterPreview = {
        id: writer.id,
        name: writer.name,
        total: writer.total,
      };

      router.push({
        pathname: '/writer/[id]',
        params: {
          id: writer.id,
          item: JSON.stringify(payload),
        },
      });
    },
    [router]
  );

  const handleReleaseYearPress = useCallback(
    (year: SearchStatItem) => {
      const payload: ReleaseYearPreview = {
        id: year.id,
        name: year.name,
        total: year.total,
      };

      router.push({
        pathname: '/release-year/[id]',
        params: {
          id: year.id,
          item: JSON.stringify(payload),
        },
      });
    },
    [router]
  );

  const handleTracksEndReached = useCallback(() => {
    if (activeTab === 'myTracks') {
      if (hasNextMyTracks && !isFetchingNextMyTracks) {
        fetchNextMyTracks();
      }
      return;
    }

    if (activeTab === 'tracks' && hasNextSongs && !isFetchingNextSongs) {
      fetchNextSongs();
    }
  }, [activeTab, fetchNextMyTracks, fetchNextSongs, hasNextMyTracks, hasNextSongs, isFetchingNextMyTracks, isFetchingNextSongs]);

  const renderNonTrackItem = useCallback(({ item }: { item: any }) => {
    switch (activeTab) {
      case 'albums':
        return (
          <Album
            album={item}
            onPress={handleAlbumPress}
          />
        );
      case 'artists':
        return <Stat item={item} onPress={handleArtistPress} />;
      case 'writers':
        return <Stat item={item} onPress={handleWriterPress} />;
      case 'releaseYears':
        return <Stat unitLabel="songs" item={item} onPress={handleReleaseYearPress} />;
      default:
        return null;
    }
  }, [activeTab, handleAlbumPress, handleArtistPress, handleWriterPress, handleReleaseYearPress]);

  const nonTrackLoading = useMemo(() => {
    switch (activeTab) {
      case 'albums':
        return isFetchingNextAlbums;
      case 'artists':
        return isFetchingNextArtists;
      case 'writers':
        return isFetchingNextWriters;
      case 'releaseYears':
        return isFetchingNextReleaseYears;
      default:
        return false;
    }
  }, [
    activeTab,
    isFetchingNextAlbums,
    isFetchingNextArtists,
    isFetchingNextWriters,
    isFetchingNextReleaseYears,
  ]);

  const nonTrackFooter = useMemo(
    () => <ListFooter isLoading={nonTrackLoading} />,
    [nonTrackLoading]
  );

  const listContentStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + tabBarHeight + 24,
    }),
    [insets.bottom, tabBarHeight]
  );

  // ✅ This is the memoized listData
  const listData: any = useMemo(() => {
    let pagesData;
    // 1. Select the correct data source based on the active tab
    switch (activeTab) {
      case 'tracks':
        pagesData = songsRecords;
        break;
      case 'myTracks':
        pagesData = myTrackRecords;
        break;
      case 'albums':
        pagesData = albumItems;
        break;
      case 'artists':
        pagesData = artistItems;
        break;
      case 'writers':
        pagesData = writerItems;
        break;
      case 'releaseYears':
        pagesData = releaseYearItems;
        break;
      default:
        return [];
    }
    return pagesData;
  }, [
    // 3. List all dependencies. The calculation will only re-run if one of these changes.
    activeTab,
    songsRecords,
    myTrackRecords,
    albumItems,
    artistItems,
    writerItems,
    releaseYearItems,
  ]);

  const handleNonTrackEndReached = useCallback(() => {
    switch (activeTab) {
      case 'albums':
        if (hasNextAlbums && !isFetchingNextAlbums) {
          fetchNextAlbums();
        }
        break;
      case 'artists':
        if (hasNextArtists && !isFetchingNextArtists) {
          fetchNextArtists();
        }
        break;
      case 'writers':
        if (hasNextWriters && !isFetchingNextWriters) {
          fetchNextWriters();
        }
        break;
      case 'releaseYears':
        if (hasNextReleaseYears && !isFetchingNextReleaseYears) {
          fetchNextReleaseYears();
        }
        break;
      default:
        break;
    }
  }, [
    activeTab,
    hasNextAlbums,
    isFetchingNextAlbums,
    fetchNextAlbums,
    hasNextArtists,
    isFetchingNextArtists,
    fetchNextArtists,
    hasNextWriters,
    isFetchingNextWriters,
    fetchNextWriters,
    hasNextReleaseYears,
    isFetchingNextReleaseYears,
    fetchNextReleaseYears,
  ]);

  const isTracksTab = activeTab === 'tracks';
  const isMyTracksTab = activeTab === 'myTracks';
  const isTrackListTab = isTracksTab || isMyTracksTab;
  const trackListRecords = isMyTracksTab ? myTrackRecords : songsRecords;

  const trackListFooter = useMemo(
    () => (
      <ListFooter
        isLoading={isTracksTab ? isFetchingNextSongs : isMyTracksTab ? isFetchingNextMyTracks : false}
      />
    ),
    [isFetchingNextMyTracks, isFetchingNextSongs, isMyTracksTab, isTracksTab]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.View
        entering={FadeInUp.duration(340)}
        style={styles.content}
      >
        <ListHeader
          query={query}
          setQuery={setQuery}
          selectedLanguages={selectedLanguages}
          setSelectedLanguages={setSelectedLanguages}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeResultsCount={listData.length}
        />
        {isTrackListTab ? (
          <TrackList
            tracks={trackListRecords}
            bookmarkedItems={bookmarkedItems}
            onPressBookmark={handleOpenPlaylistModal}
            onPressTrack={handleTrackPress}
            contentContainerStyle={listContentStyle}
            onEndReached={handleTracksEndReached}
            ListFooterComponent={trackListFooter}
            ListEmptyComponent={SearchEmptyState}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={listData}
            renderItem={renderNonTrackItem}
            keyExtractor={(item) => String(item.id)}
            onEndReached={handleNonTrackEndReached}
            onEndReachedThreshold={0.5}
            contentContainerStyle={listContentStyle}
            ListFooterComponent={nonTrackFooter}
            ListEmptyComponent={SearchEmptyState}
            ItemSeparatorComponent={Divider}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
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
    </SafeAreaView>
  );
}
