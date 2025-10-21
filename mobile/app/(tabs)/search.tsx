import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Divider, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Track } from '@/components/search/Track';
import { Album, type SearchAlbumItem } from '@/components/search/Album';
import { Stat } from '@/components/search/Stat';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { PlaylistSelectionModal } from '@/components/search/PlaylistSelectionModal';
import { type FilterLanguage } from '@/constants/home';
import { MOCK_PLAYLISTS } from '@/constants/playlists';
import { SongRecord, useSongsSearch } from '@/hooks/useSongsSearch';
import { AlbumRecord, useAlbumsSearch } from '@/hooks/useAlbumsSearch';
import { ArtistRecord, useArtistsSearch } from '@/hooks/useArtistsSearch';
import { useWritersSearch, WriterRecord } from '@/hooks/useWritersSearch';
import { ReleaseYearRecord, useReleaseYearsSearch } from '@/hooks/useReleaseYearsSearch';
import ListHeader from '@/components/search/ListHeader';
import ListFooter from '@/components/search/ListFooter';

type SearchTabKey = 'tracks' | 'albums' | 'artists' | 'writers' | 'releaseYears';

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
  const [query, setQuery] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<FilterLanguage[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [trackPlaylistMap, setTrackPlaylistMap] = useState<Record<string, string[]>>({});
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [activeTrack, setActiveTrack] = useState<SongRecord | null>(null);
  const [draftSelectedPlaylists, setDraftSelectedPlaylists] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<SearchTabKey>('tracks');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight?.() ?? 0;
  const trimmedQuery = query.trim();

  const {
    data: songsPages,
    fetchNextPage: fetchNextSongs,
    hasNextPage: hasNextSongs,
    isFetchingNextPage: isFetchingNextSongs,
  } = useSongsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
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
  const albumsRecords = useMemo(
    () => albumsPages?.pages.flatMap((page) => extractPageData<AlbumRecord>(page)) ?? [],
    [albumsPages]
  );
  const artists = useMemo(
    () => artistsPages?.pages.flatMap((page) => extractPageData<ArtistRecord>(page)) ?? [],
    [artistsPages]
  );
  const writers = useMemo(
    () => writersPages?.pages.flatMap((page) => extractPageData<WriterRecord>(page)) ?? [],
    [writersPages]
  );
  const releaseYears = useMemo(
    () => releaseYearsPages?.pages.flatMap((page) => extractPageData<ReleaseYearRecord>(page)) ?? [],
    [releaseYearsPages]
  );

  const albums = useMemo<SearchAlbumItem[]>(() => {
    if (albumsRecords.length === 0) return [];
    return albumsRecords
      .filter((album) => album && album.id != null && album.name)
      .map((album) => ({
        id: String(album.id),
        title: album.name,
        artist:
          album.artists?.map((artist) => artist?.name).filter(Boolean).join(', ') || 'Unknown artist',
        trackCount: typeof album.total === 'number' ? album.total : 0,
      }));
  }, [albumsRecords]);
  const playlists = useMemo(() => MOCK_PLAYLISTS, []);
  const toggleBookmark = useCallback((itemId: string) => {
    setBookmarkedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);
  const handleClosePlaylistModal = useCallback(() => {
    setPlaylistModalVisible(false);
    setActiveTrack(null);
    setDraftSelectedPlaylists(() => new Set());
  }, []);

  const handleOpenPlaylistModal = useCallback(
    (track: SongRecord) => {
      const trackKey = `track-${track.id}`;
      const existingSelections = trackPlaylistMap[trackKey] ?? [];
      setDraftSelectedPlaylists(() => new Set(existingSelections));
      setActiveTrack(track);
      setPlaylistModalVisible(true);
    },
    [trackPlaylistMap]
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

  const handleConfirmPlaylists = useCallback(() => {
    if (!activeTrack) {
      handleClosePlaylistModal();
      return;
    }
    const trackKey = `track-${activeTrack.id}`;
    const selectedArray = Array.from(draftSelectedPlaylists);

    setTrackPlaylistMap((prev) => {
      const next = { ...prev };
      if (selectedArray.length > 0) {
        next[trackKey] = selectedArray;
      } else {
        delete next[trackKey];
      }
      return next;
    });

    setBookmarkedItems((prev) => {
      const next = new Set(prev);
      if (selectedArray.length > 0) {
        next.add(trackKey);
      } else {
        next.delete(trackKey);
      }
      return next;
    });

    handleClosePlaylistModal();
  }, [activeTrack, draftSelectedPlaylists, handleClosePlaylistModal]);

  const handleTrackPress = useCallback(
    (track: SongRecord) => {
      router.push({ pathname: '/song/[id]', params: { id: track.id, item: JSON.stringify(track)} });
    },
    [router]
  );

  // 1. Create a single, dynamic renderItem function with useCallback
  const renderItem = useCallback(({ item }: { item: any }) => {
    // 2. Use a switch statement to check the active tab
    switch (activeTab) {
      case 'tracks':
        return (
          <Track
            item={item} // Pass the item as a 'track' prop
            bookmarkedItems={bookmarkedItems}
            onPressBookmark={handleOpenPlaylistModal}
            onPressTrack={handleTrackPress}
          />
        );
      case 'artists':
        return (
          <Stat item={item} />
        );
      case 'albums':
        return (
          <Album
            album={item}
            bookmarkedItems={bookmarkedItems}
            onToggleBookmark={toggleBookmark}
          />
        )
      case 'writers':
        return (
          <Stat item={item} />
        );
      case 'releaseYears':
        return (
          <Stat
            unitLabel="songs"
            item={item} />
        );
      default:
        return null;
    }
  }, [
    activeTab,
    bookmarkedItems,
    toggleBookmark,
    handleOpenPlaylistModal,
    handleTrackPress,
  ]);

  const isFetchingNext = useMemo(() => {
    switch (activeTab) {
      case 'tracks':
        return isFetchingNextSongs;
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
    isFetchingNextSongs,
    isFetchingNextAlbums,
    isFetchingNextArtists,
    isFetchingNextWriters,
    isFetchingNextReleaseYears,
  ]);

  // 2. Your renderFooter function is now clean and simple.
  const renderFooter = useCallback(() => (
    <ListFooter isLoading={isFetchingNext} />
  ), [isFetchingNext]);

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
        pagesData = songsRecords
        break;
      case 'albums':
        pagesData = albums;
        break;
      case 'artists':
        pagesData = artists
        break;
      case 'writers':
        pagesData = writers;
        break;
      case 'releaseYears':
        pagesData = releaseYears;
        break;
      default:
        return [];
    }
    return pagesData;
  }, [
    // 3. List all dependencies. The calculation will only re-run if one of these changes.
    activeTab,
    songsRecords,
    albums,
    artists,
    writers,
    releaseYears,
  ]);

  const handleEndReached = useCallback(() => {
    // Use a switch statement to route the logic
    console.log('End reached for tab:', activeTab);
    switch (activeTab) {
      case 'tracks':
        // Check the conditions specifically for songs
        if (hasNextSongs && !isFetchingNextSongs) {
          fetchNextSongs();
        }
        break;
      case 'albums':
        if (hasNextAlbums && !isFetchingNextAlbums) {
          fetchNextAlbums();
        }
        break;
      case 'artists':
        // Check the conditions specifically for artists
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
        // Do nothing if the tab is not recognized
        break;
    }
  }, [
    // IMPORTANT: Include ALL variables from ALL tabs in the dependency array
    activeTab,
    hasNextSongs, isFetchingNextSongs, fetchNextSongs,
    hasNextAlbums, isFetchingNextAlbums, fetchNextAlbums,
    hasNextArtists, isFetchingNextArtists, fetchNextArtists,
    hasNextWriters, isFetchingNextWriters, fetchNextWriters,
    hasNextReleaseYears, isFetchingNextReleaseYears, fetchNextReleaseYears,
    // ... add dependencies for your other tabs
  ]);

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
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={listContentStyle}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={SearchEmptyState}
          ItemSeparatorComponent={() =>
                <Divider/>
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
      <PlaylistSelectionModal
        visible={isPlaylistModalVisible}
        trackTitle={activeTrack?.title}
        playlists={playlists}
        selectedIds={draftSelectedPlaylists}
        onTogglePlaylist={handleTogglePlaylistSelection}
        onConfirm={handleConfirmPlaylists}
        onCancel={handleClosePlaylistModal}
      />
    </SafeAreaView>
  );
}
