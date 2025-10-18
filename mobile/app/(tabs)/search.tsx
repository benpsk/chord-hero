import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Track, type SearchTrackItem } from '@/components/search/Track';
import { Album, type SearchAlbumItem } from '@/components/search/Album';
import { Stat } from '@/components/search/Stat';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { type FilterLanguage } from '@/constants/home';
import { SongRecord, useSongsSearch } from '@/hooks/useSongsSearch';
import { AlbumRecord, useAlbumsSearch } from '@/hooks/useAlbumsSearch';
import { ArtistRecord, useArtistsSearch } from '@/hooks/useArtistsSearch';
import { useWritersSearch, WriterRecord } from '@/hooks/useWritersSearch';
import { ReleaseYearRecord, useReleaseYearsSearch } from '@/hooks/useReleaseYearsSearch';
import ListHeader from '@/components/search/ListHeader';
import ListFooter from '@/components/search/ListFooter';

type SearchTabKey = 'tracks' | 'albums' | 'artists' | 'writers' | 'releaseYears';
type SearchTrack = SearchTrackItem & { language?: FilterLanguage };

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
  const [activeTab, setActiveTab] = useState<SearchTabKey>('tracks');
  const theme = useTheme();
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
        },
        headingGroup: {
          gap: 4,
        },
        headingTitle: {
          fontSize: 28,
          fontWeight: '700',
        },
        headingSubtitle: {
          color: theme.colors.secondary,
          fontSize: 15,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: '700',
        },
        sectionSubtitle: {
          fontSize: 14,
        },
        loadingMore: {
          paddingVertical: 16,
        },
        trackCard: {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.tertiary,
        },
        trackRipple: {
          paddingVertical: 16,
        },
        trackRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        },
        trackInfo: {
          flex: 1,
          gap: 4,
        },
        trackTitle: {
          fontSize: 16,
          fontWeight: '700',
        },
        trackMetaLine: {
          fontSize: 13,
        },
        metaGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        metaBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.colors.secondary,
        },
        metaText: {
          color: theme.colors.onSecondary,
          fontSize: 12,
          fontWeight: '600',
        },
        iconButton: {
          margin: -8,
        },
        loadingText: {
          textAlign: 'center',
        },
      }),
    [theme.colors.background, theme.colors.secondary]
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

  const tracks = useMemo<SearchTrack[]>(() => {
    if (songsRecords.length === 0) return [];
    const normalizeLanguage = (value?: string | null): FilterLanguage | undefined => {
      if (!value) return undefined;
      const normalized = value.trim().toLowerCase();
      if (normalized === 'english') return 'English';
      if (normalized === 'burmese') return 'Burmese';
      if (normalized === 'zomi') return 'Zomi';
      return undefined;
    };
    return songsRecords
      .filter((song) => song && song.id != null && song.title)
      .map((song) => {
        const artistNames =
          song.artists?.map((artist) => artist?.name).filter(Boolean).join(', ') || 'Unknown artist';
        const composerNames =
          song.writers?.map((writer) => writer?.name).filter(Boolean).join(', ') || undefined;
        return {
          id: String(song.id),
          title: song.title,
          artist: artistNames,
          composer: composerNames,
          key: song.key ?? undefined,
          level: song.level ?? undefined,
          language: normalizeLanguage(song.language),
        };
      });
  }, [songsRecords]);

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

  const handleTrackPress = useCallback(
    (trackId: string) => {
      router.push({ pathname: '/song/[id]', params: { id: trackId } });
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
            onToggleBookmark={toggleBookmark}
            onPressTrack={handleTrackPress}
            styles={styles}
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
    handleTrackPress,
    styles,
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

  // ✅ This is the memoized listData
  const listData: any = useMemo(() => {
    let pagesData;
    // 1. Select the correct data source based on the active tab
    switch (activeTab) {
      case 'tracks':
        pagesData = tracks
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
          styles={styles}
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
          ListFooterComponent={renderFooter}
          ListEmptyComponent={SearchEmptyState}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
