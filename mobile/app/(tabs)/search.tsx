import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, IconButton, Menu, Surface, Text, TextInput, TouchableRipple } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { FILTER_LANGUAGES, type FilterLanguage } from '@/constants/home';
import { SONGS } from '@/constants/songs';
import { useColorScheme } from '@/hooks/useColorScheme';

type SearchTrack = {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  key?: string;
  level?: string;
  language?: FilterLanguage;
};
type SearchTabKey = 'tracks' | 'albums' | 'artists';

type SearchAlbum = {
  id: string;
  title: string;
  artist: string;
  trackCount: number;
};

type SearchArtist = {
  id: string;
  name: string;
  songCount: number;
};

const SEARCH_TRACKS: SearchTrack[] = SONGS.map((song) => ({
  id: song.id,
  title: song.title,
  artist: song.artist ?? 'Unknown artist',
  composer: song.composer,
  key: song.key,
  level: song.level,
  language: song.language as FilterLanguage | undefined,
}));

const SEARCH_ALBUMS: SearchAlbum[] = [
  { id: 'album-01', title: 'Album 01', artist: 'Jessica Gonzalez', trackCount: 12 },
  { id: 'album-02', title: 'Album 02', artist: 'Jeff Clay', trackCount: 8 },
  { id: 'album-03', title: 'Album 03', artist: 'Ashley Scott', trackCount: 14 },
  { id: 'album-04', title: 'Album 04', artist: 'Reina Carter', trackCount: 9 },
];

const SEARCH_ARTISTS: SearchArtist[] = [
  { id: 'artist-01', name: 'Jessica Gonzalez', songCount: 32 },
  { id: 'artist-02', name: 'Jeff Clay', songCount: 24 },
  { id: 'artist-03', name: 'Ashley Scott', songCount: 18 },
  { id: 'artist-04', name: 'Reina Carter', songCount: 21 },
];

const SEARCH_TABS: { key: SearchTabKey; label: string }[] = [
  { key: 'tracks', label: 'Tracks' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<FilterLanguage[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SearchTabKey>('tracks');

  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
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
          color: palette.text,
          fontSize: 28,
          fontWeight: '700',
        },
        headingSubtitle: {
          color: palette.icon,
          fontSize: 15,
        },
        searchWrapper: {
          zIndex: 20,
        },
        tabBar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          paddingTop: 8,
        },
        tabButton: {
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        tabLabel: {
          color: palette.icon,
          fontSize: 16,
          fontWeight: '600',
        },
        tabLabelActive: {
          color: palette.tint,
        },
        tabIndicator: {
          marginTop: 6,
          height: 2,
          width: 40,
          borderRadius: 1,
          backgroundColor: 'transparent',
        },
        tabIndicatorActive: {
          backgroundColor: palette.tint,
        },
        searchInput: {
          backgroundColor: palette.background,
        },
        menuContent: {
          backgroundColor: palette.background,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : '#E5E7EB',
        },
        filtersRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        chip: {
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        sectionTitle: {
          color: palette.text,
          fontSize: 18,
          fontWeight: '700',
        },
        sectionSubtitle: {
          color: palette.icon,
          fontSize: 14,
        },
        trackList: {
          gap: 8,
        },
        trackCard: {
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
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
          color: palette.text,
          fontSize: 16,
          fontWeight: '700',
        },
        trackMetaLine: {
          color: palette.icon,
          fontSize: 13,
        },
        metaGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        metaChip: {
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
        },
        metaText: {
          fontSize: 12,
          fontWeight: '600',
          color: palette.text,
        },
        iconButton: {
          margin: -8,
        },
        emptyState: {
          alignItems: 'center',
          paddingVertical: 48,
          gap: 8,
        },
        emptyTitle: {
          color: palette.text,
          fontSize: 16,
          fontWeight: '600',
        },
        emptySubtitle: {
          color: palette.icon,
          fontSize: 14,
          textAlign: 'center',
        },
        albumRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        },
        albumMeta: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        countChip: {
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
        },
        artistRow: {
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        },
        artistMeta: {
          marginTop: 6,
          color: palette.icon,
          fontSize: 13,
        },
      }),
    [colorScheme, palette]
  );

  const openMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);
  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const toggleLanguage = useCallback((lang: FilterLanguage) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        return prev.filter((item) => item !== lang);
      }
      return [...prev, lang];
    });
  }, []);

  const clearLanguages = useCallback(() => {
    setSelectedLanguages([]);
    closeMenu();
  }, [closeMenu]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return SEARCH_TRACKS.filter((track) => {
      const matchesQuery = normalizedQuery.length === 0
        || track.title.toLowerCase().includes(normalizedQuery)
        || track.artist.toLowerCase().includes(normalizedQuery)
        || (track.composer ? track.composer.toLowerCase().includes(normalizedQuery) : false)
        || (track.level ? track.level.toLowerCase().includes(normalizedQuery) : false);

      const matchesLanguage = selectedLanguages.length === 0
        || (track.language ? selectedLanguages.includes(track.language) : true);

      return matchesQuery && matchesLanguage;
    });
  }, [query, selectedLanguages]);

  const filteredAlbums = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return SEARCH_ALBUMS;
    return SEARCH_ALBUMS.filter((album) =>
      album.title.toLowerCase().includes(normalizedQuery)
      || album.artist.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  const filteredArtists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return SEARCH_ARTISTS;
    return SEARCH_ARTISTS.filter((artist) =>
      artist.name.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

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

  const activeResultsCount = useMemo(() => {
    switch (activeTab) {
      case 'albums':
        return filteredAlbums.length;
      case 'artists':
        return filteredArtists.length;
      default:
        return filteredTracks.length;
    }
  }, [activeTab, filteredAlbums.length, filteredArtists.length, filteredTracks.length]);

  const handleTrackPress = useCallback(
    (trackId: string) => {
      router.push({ pathname: '/song/[id]', params: { id: trackId } });
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(340)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.headingGroup} entering={FadeInDown.duration(300)}>
          <Text variant="headlineSmall" style={styles.headingTitle}>
            Search
          </Text>
          <Text variant="bodyMedium" style={styles.headingSubtitle}>
            Find tracks, artists, and albums.
          </Text>
        </Animated.View>

        <Animated.View style={styles.searchWrapper} entering={FadeInUp.delay(60).duration(320)}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchorPosition="bottom"
            contentStyle={styles.menuContent}
            anchor={
              <TextInput
                mode="outlined"
                value={query}
                onChangeText={setQuery}
                placeholder="Search songs, artists, or albums"
                left={<TextInput.Icon icon="magnify" />}
                right={<TextInput.Icon icon="dots-horizontal" onPress={openMenu} forceTextInputFocus={false} />}
                style={styles.searchInput}
                dense
              />
            }>
            {FILTER_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguages.includes(lang);
              return (
                <Menu.Item
                  key={lang}
                  onPress={() => toggleLanguage(lang)}
                  title={lang}
                  leadingIcon={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                />
              );
            })}
            <Menu.Item onPress={clearLanguages} title="Clear languages" leadingIcon="close" />
          </Menu>
        </Animated.View>

        <Animated.View style={styles.tabBar} entering={FadeInUp.delay(100).duration(320)}>
          {SEARCH_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabButton}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
              </Pressable>
            );
          })}
        </Animated.View>

        {selectedLanguages.length > 0 && (
          <Animated.View style={styles.filtersRow} entering={FadeInUp.delay(140).duration(320)}>
            {selectedLanguages.map((lang) => (
              <Chip
                key={lang}
                style={styles.chip}
                mode="outlined"
                onClose={() => toggleLanguage(lang)}>
                {lang}
              </Chip>
            ))}
          </Animated.View>
        )}

        <Animated.View style={styles.sectionHeader} entering={FadeInUp.delay(160).duration(320)}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {SEARCH_TABS.find((tab) => tab.key === activeTab)?.label}
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            {activeResultsCount} result{activeResultsCount === 1 ? '' : 's'}
          </Text>
        </Animated.View>

        {activeTab === 'tracks' && filteredTracks.length > 0 ? (
          <Animated.View style={styles.trackList} entering={FadeInUp.delay(200).duration(340)}>
            {filteredTracks.map((track, index) => (
              <Animated.View key={track.id} entering={FadeInUp.delay(200 + index * 30).duration(300)}>
              <Surface style={styles.trackCard} elevation={0}>
                <TouchableRipple
                  style={styles.trackRipple}
                  borderless
                  onPress={() => handleTrackPress(track.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${track.title}`}>
                  <View style={styles.trackRow}>
                    <View style={styles.trackInfo}>
                      <Text variant="titleSmall" style={styles.trackTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text variant="bodySmall" style={styles.trackMetaLine} numberOfLines={1}>
                        {track.artist}
                        {track.composer ? ` | ${track.composer}` : ''}
                      </Text>
                    </View>
                    <View style={styles.metaGroup}>
                      <Chip compact style={styles.metaChip} textStyle={styles.metaText}>
                        {track.key ?? '—'}
                      </Chip>
                      <Chip compact style={styles.metaChip} textStyle={styles.metaText}>
                        {track.level ?? '—'}
                      </Chip>
                      {(() => {
                        const trackKey = `track-${track.id}`;
                        const isBookmarked = bookmarkedItems.has(trackKey);
                        return (
                          <IconButton
                            icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                            size={20}
                            iconColor={isBookmarked ? palette.tint : palette.icon}
                            style={styles.iconButton}
                            onPress={() => toggleBookmark(trackKey)}
                            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                          />
                        );
                      })()}
                    </View>
                  </View>
                </TouchableRipple>
              </Surface>
              </Animated.View>
            ))}
          </Animated.View>
        ) : null}

        {activeTab === 'albums' && filteredAlbums.length > 0 ? (
          <Animated.View style={styles.trackList} entering={FadeInUp.delay(200).duration(340)}>
            {filteredAlbums.map((album, index) => {
              const albumKey = `album-${album.id}`;
              const isBookmarked = bookmarkedItems.has(albumKey);
              return (
                <Animated.View key={album.id} style={styles.albumRow} entering={FadeInUp.delay(220 + index * 40).duration(300)}>
                  <View style={styles.trackInfo}>
                    <Text variant="titleSmall" style={styles.trackTitle} numberOfLines={1}>
                      {album.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.trackMetaLine} numberOfLines={1}>
                      {album.artist}
                    </Text>
                  </View>
                  <View style={styles.albumMeta}>
                    <Chip compact style={styles.countChip} textStyle={styles.metaText}>
                      {album.trackCount}
                    </Chip>
                    <IconButton
                      icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      iconColor={isBookmarked ? palette.tint : palette.icon}
                      style={styles.iconButton}
                      onPress={() => toggleBookmark(albumKey)}
                      accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    />
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : null}

        {activeTab === 'artists' && filteredArtists.length > 0 ? (
          <Animated.View style={styles.trackList} entering={FadeInUp.delay(200).duration(340)}>
            {filteredArtists.map((artist, index) => (
              <Animated.View key={artist.id} style={styles.artistRow} entering={FadeInUp.delay(220 + index * 40).duration(300)}>
                <Text variant="titleSmall" style={styles.trackTitle} numberOfLines={1}>
                  {artist.name}
                </Text>
                <Text variant="bodySmall" style={styles.artistMeta}>
                  {artist.songCount} song{artist.songCount === 1 ? '' : 's'}
                </Text>
              </Animated.View>
            ))}
          </Animated.View>
        ) : null}

        {((activeTab === 'tracks' && filteredTracks.length === 0)
          || (activeTab === 'albums' && filteredAlbums.length === 0)
          || (activeTab === 'artists' && filteredArtists.length === 0)) && (
          <Animated.View style={styles.emptyState} entering={FadeInUp.delay(200).duration(320)}>
            <Text variant="titleSmall" style={styles.emptyTitle}>
              No matches yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Try adjusting your search or removing filters to see more songs.
            </Text>
          </Animated.View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
