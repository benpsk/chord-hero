import React, { useCallback, useMemo, useState } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { SearchFilterBar } from '@/components/search/SearchFilterBar';
import { SearchTabBar } from '@/components/search/SearchTabBar';
import { SearchTracksList, type SearchTrackItem } from '@/components/search/SearchTracksList';
import { SearchAlbumsList, type SearchAlbumItem } from '@/components/search/SearchAlbumsList';
import { SearchStatList, type SearchStatItem } from '@/components/search/SearchStatList';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { type FilterLanguage } from '@/constants/home';
import { useSongsSearch } from '@/hooks/useSongsSearch';
import { useAlbumsSearch } from '@/hooks/useAlbumsSearch';
import { useArtistsSearch } from '@/hooks/useArtistsSearch';
import { useWritersSearch } from '@/hooks/useWritersSearch';
import { useReleaseYearsSearch } from '@/hooks/useReleaseYearsSearch';

type SearchTabKey = 'tracks' | 'albums' | 'artists' | 'writers' | 'releaseYears';

type SearchTrack = SearchTrackItem & { language?: FilterLanguage };

type SearchWriter = {
  id: string;
  name: string;
  songCount: number;
};

type SearchReleaseYear = {
  id: string;
  name: string;
  songCount: number;
};

const SEARCH_TABS: { key: SearchTabKey; label: string }[] = [
  { key: 'tracks', label: 'Tracks' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'writers', label: 'Writers' },
  { key: 'releaseYears', label: 'Release year' },
];

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
    isPending: isSongsLoading,
    error: songsError,
    fetchNextPage: fetchNextSongs,
    hasNextPage: hasNextSongs,
    isFetchingNextPage: isFetchingNextSongs,
  } = useSongsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: albumsPages,
    isPending: isAlbumsLoading,
    error: albumsError,
    fetchNextPage: fetchNextAlbums,
    hasNextPage: hasNextAlbums,
    isFetchingNextPage: isFetchingNextAlbums,
  } = useAlbumsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: artistsPages,
    isPending: isArtistsLoading,
    error: artistsError,
    fetchNextPage: fetchNextArtists,
    hasNextPage: hasNextArtists,
    isFetchingNextPage: isFetchingNextArtists,
  } = useArtistsSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: writersPages,
    isPending: isWritersLoading,
    error: writersError,
    fetchNextPage: fetchNextWriters,
    hasNextPage: hasNextWriters,
    isFetchingNextPage: isFetchingNextWriters,
  } = useWritersSearch(trimmedQuery ? { search: trimmedQuery } : undefined);
  const {
    data: releaseYearsPages,
    isPending: isReleaseYearsLoading,
    error: releaseYearsError,
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
          paddingBottom: 48,
          gap: 24,
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
      }),
    [theme.colors.background, theme.colors.secondary]
  );

  const songsRecords = useMemo(
    () => songsPages?.pages.flatMap((page) => extractPageData(page)) ?? [],
    [songsPages]
  );
  const albumsRecords = useMemo(
    () => albumsPages?.pages.flatMap((page) => extractPageData(page)) ?? [],
    [albumsPages]
  );
  const artistsRecords = useMemo(
    () => artistsPages?.pages.flatMap((page) => extractPageData(page)) ?? [],
    [artistsPages]
  );
  const writersRecords = useMemo(
    () => writersPages?.pages.flatMap((page) => extractPageData(page)) ?? [],
    [writersPages]
  );
  const releaseYearsRecords = useMemo(
    () => releaseYearsPages?.pages.flatMap((page) => extractPageData(page)) ?? [],
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

  const artists = useMemo<SearchStatItem[]>(() => {
    if (artistsRecords.length === 0) return [];
    return artistsRecords
      .filter((artist) => artist && artist.id != null && artist.name)
      .map((artist) => ({
        id: String(artist.id),
        label: artist.name,
        count: typeof artist.total === 'number' ? artist.total ?? 0 : 0,
      }));
  }, [artistsRecords]);

  const writers = useMemo<SearchWriter[]>(() => {
    if (writersRecords.length === 0) return [];
    return writersRecords
      .filter((writer) => writer && writer.id != null && writer.name)
      .map((writer) => ({
        id: String(writer.id),
        name: writer.name,
        songCount: typeof writer.total === 'number' ? writer.total ?? 0 : 0,
      }));
  }, [writersRecords]);

  const releaseYears = useMemo<SearchReleaseYear[]>(() => {
    if (releaseYearsRecords.length === 0) return [];
    return releaseYearsRecords
      .filter((item) => item && item.id != null && item.name != null)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        songCount: typeof item.total === 'number' ? item.total ?? 0 : 0,
      }));
  }, [releaseYearsRecords]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase();

    return tracks.filter((track) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        track.title.toLowerCase().includes(normalizedQuery) ||
        track.artist.toLowerCase().includes(normalizedQuery) ||
        (track.composer ? track.composer.toLowerCase().includes(normalizedQuery) : false) ||
        (track.level ? track.level.toLowerCase().includes(normalizedQuery) : false);

      const matchesLanguage =
        selectedLanguages.length === 0 ||
        (track.language ? selectedLanguages.includes(track.language) : true);

      return matchesQuery && matchesLanguage;
    });
  }, [selectedLanguages, tracks, trimmedQuery]);

  const filteredAlbums = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase();
    if (normalizedQuery.length === 0) return albums;
    return albums.filter(
      (album) =>
        album.title.toLowerCase().includes(normalizedQuery) ||
        album.artist.toLowerCase().includes(normalizedQuery)
    );
  }, [albums, trimmedQuery]);

  const filteredArtists = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase();
    if (normalizedQuery.length === 0) return artists;
    return artists.filter((artist) => artist.label.toLowerCase().includes(normalizedQuery));
  }, [artists, trimmedQuery]);

  const filteredWriters = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase();
    if (normalizedQuery.length === 0) return writers;
    return writers.filter((writer) => writer.name.toLowerCase().includes(normalizedQuery));
  }, [trimmedQuery, writers]);

  const filteredReleaseYears = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase();
    if (normalizedQuery.length === 0) return releaseYears;
    return releaseYears.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [releaseYears, trimmedQuery]);

  const trackDisplayItems = useMemo(
    () => filteredTracks.map(({ language: _language, ...rest }) => rest),
    [filteredTracks]
  );

  const writerDisplayItems = useMemo(
    () =>
      filteredWriters.map((writer) => ({
        id: writer.id,
        label: writer.name,
        count: writer.songCount,
      })),
    [filteredWriters]
  );

  const releaseYearDisplayItems = useMemo(
    () =>
      filteredReleaseYears.map((item) => ({
        id: item.id,
        label: item.name,
        count: item.songCount,
      })),
    [filteredReleaseYears]
  );

  const activeResultsCount = useMemo(() => {
    switch (activeTab) {
      case 'albums':
        return filteredAlbums.length;
      case 'artists':
        return filteredArtists.length;
      case 'writers':
        return filteredWriters.length;
      case 'releaseYears':
        return filteredReleaseYears.length;
      default:
        return filteredTracks.length;
    }
  }, [
    activeTab,
    filteredAlbums.length,
    filteredArtists.length,
    filteredReleaseYears.length,
    filteredTracks.length,
    filteredWriters.length,
  ]);

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

  const showTracksEmpty =
    activeTab === 'tracks' &&
    filteredTracks.length === 0 &&
    !isSongsLoading &&
    !songsError;
  const showAlbumsEmpty =
    activeTab === 'albums' &&
    filteredAlbums.length === 0 &&
    !isAlbumsLoading &&
    !albumsError;
  const showArtistsEmpty =
    activeTab === 'artists' &&
    filteredArtists.length === 0 &&
    !isArtistsLoading &&
    !artistsError;
  const showWritersEmpty =
    activeTab === 'writers' &&
    filteredWriters.length === 0 &&
    !isWritersLoading &&
    !writersError;
  const showReleaseYearsEmpty =
    activeTab === 'releaseYears' &&
    filteredReleaseYears.length === 0 &&
    !isReleaseYearsLoading &&
    !releaseYearsError;

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'tracks') {
      return;
    }
    switch (activeTab) {
      case 'tracks':
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
    fetchNextAlbums,
    fetchNextArtists,
    fetchNextReleaseYears,
    fetchNextSongs,
    fetchNextWriters,
    hasNextAlbums,
    hasNextArtists,
    hasNextReleaseYears,
    hasNextSongs,
    hasNextWriters,
    isFetchingNextAlbums,
    isFetchingNextArtists,
    isFetchingNextReleaseYears,
    isFetchingNextSongs,
    isFetchingNextWriters,
  ]);

  const handleTracksEndReached = useCallback(() => {
    if (hasNextSongs && !isFetchingNextSongs) {
      fetchNextSongs();
    }
  }, [fetchNextSongs, hasNextSongs, isFetchingNextSongs]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (activeTab === 'tracks') {
        return;
      }
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const threshold = 200;
      if (contentSize.height <= 0) return;
      if (contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold) {
        handleLoadMore();
      }
    },
    [activeTab, handleLoadMore]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(340)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        <Animated.View style={styles.headingGroup} entering={FadeInDown.duration(300)}>
          <Text variant="headlineSmall" style={styles.headingTitle}>
            Search
          </Text>
          <Text variant="bodyMedium" style={styles.headingSubtitle}>
            Find tracks, artists, albums, writers, and release years.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).duration(320)}>
          <SearchFilterBar
            query={query}
            onQueryChange={setQuery}
            selectedLanguages={selectedLanguages}
            onToggleLanguage={(lang) =>
              setSelectedLanguages((prev) =>
                prev.includes(lang) ? prev.filter((item) => item !== lang) : [...prev, lang]
              )
            }
            onClearLanguages={() => setSelectedLanguages([])}
          />
        </Animated.View>

        {activeTab === 'tracks' && songsError ? (
          <SearchEmptyState
            title="Something went wrong"
            subtitle={
              songsError instanceof Error ? songsError.message : 'Unable to load songs right now.'
            }
            delay={120}
          />
        ) : null}

        {activeTab === 'albums' && albumsError ? (
          <SearchEmptyState
            title="Something went wrong"
            subtitle={
              albumsError instanceof Error
                ? albumsError.message
                : 'Unable to load albums right now.'
            }
            delay={120}
          />
        ) : null}

        {activeTab === 'artists' && artistsError ? (
          <SearchEmptyState
            title="Something went wrong"
            subtitle={
              artistsError instanceof Error
                ? artistsError.message
                : 'Unable to load artists right now.'
            }
            delay={120}
          />
        ) : null}

        {activeTab === 'writers' && writersError ? (
          <SearchEmptyState
            title="Something went wrong"
            subtitle={
              writersError instanceof Error
                ? writersError.message
                : 'Unable to load writers right now.'
            }
            delay={120}
          />
        ) : null}

        {activeTab === 'releaseYears' && releaseYearsError ? (
          <SearchEmptyState
            title="Something went wrong"
            subtitle={
              releaseYearsError instanceof Error
                ? releaseYearsError.message
                : 'Unable to load release years right now.'
            }
            delay={120}
          />
        ) : null}

        <Animated.View entering={FadeInUp.delay(100).duration(320)}>
          <SearchTabBar
            tabs={SEARCH_TABS}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />
        </Animated.View>

        <Animated.View style={styles.sectionHeader} entering={FadeInUp.delay(160).duration(320)}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {SEARCH_TABS.find((tab) => tab.key === activeTab)?.label}
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            {activeResultsCount} result{activeResultsCount === 1 ? '' : 's'}
          </Text>
        </Animated.View>

        {activeTab === 'tracks' && filteredTracks.length > 0 ? (
          <SearchTracksList
            tracks={trackDisplayItems}
            bookmarkedItems={bookmarkedItems}
            onToggleBookmark={toggleBookmark}
            onPressTrack={handleTrackPress}
            isFetchingNextPage={isFetchingNextSongs}
            hasNextPage={!!hasNextSongs}
            onEndReached={handleTracksEndReached}
          />
        ) : null}

        {activeTab === 'albums' && filteredAlbums.length > 0 ? (
          <SearchAlbumsList
            albums={filteredAlbums}
            bookmarkedItems={bookmarkedItems}
            onToggleBookmark={toggleBookmark}
            isFetchingNextPage={isFetchingNextAlbums}
            hasNextPage={!!hasNextAlbums}
          />
        ) : null}

        {activeTab === 'artists' && filteredArtists.length > 0 ? (
          <SearchStatList
            items={filteredArtists}
            isFetchingNextPage={isFetchingNextArtists}
            hasNextPage={!!hasNextArtists}
          />
        ) : null}

        {activeTab === 'writers' && filteredWriters.length > 0 ? (
          <SearchStatList
            items={writerDisplayItems}
            isFetchingNextPage={isFetchingNextWriters}
            hasNextPage={!!hasNextWriters}
          />
        ) : null}

        {activeTab === 'releaseYears' && filteredReleaseYears.length > 0 ? (
          <SearchStatList
            items={releaseYearDisplayItems}
            unitLabel="songs"
            isFetchingNextPage={isFetchingNextReleaseYears}
            hasNextPage={!!hasNextReleaseYears}
          />
        ) : null}

        {(showTracksEmpty ||
          showAlbumsEmpty ||
          showArtistsEmpty ||
          showWritersEmpty ||
          showReleaseYearsEmpty) && <SearchEmptyState />}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
