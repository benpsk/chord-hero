import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Chip, IconButton, Menu, Surface, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { FILTER_LANGUAGES, HOME_DETAILS, type FilterLanguage } from '@/constants/home';
import { MOCK_PLAYLISTS } from '@/constants/playlists';
import { usePreferences } from '@/hooks/usePreferences';
import { TrackList } from '@/components/search/TrackList';
import type { SongRecord } from '@/hooks/useSongsSearch';
import { useTrendingLevelSongs } from '@/hooks/useTrendingLevelSongs';
import { PlaylistSelectionModal } from '@/components/search/PlaylistSelectionModal';
import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';
import { useAuth } from '@/hooks/useAuth';


export default function ChartDetailScreen() {
  const { id, name, level, level_id } = useLocalSearchParams<{ id: string; name?: string; level?: string; level_id?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const detail = id ? HOME_DETAILS[id] : undefined;
  const { themePreference } = usePreferences();
  const { isAuthenticated } = useAuth();

  const [selectedLanguages, setSelectedLanguages] = useState<FilterLanguage[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [trackPlaylistMap, setTrackPlaylistMap] = useState<Record<string, string[]>>({});
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [activeTrack, setActiveTrack] = useState<SongRecord | null>(null);
  const [draftSelectedPlaylists, setDraftSelectedPlaylists] = useState<Set<string>>(() => new Set());
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);

  const levelId = useMemo(() => {
    if (!level_id) return undefined;
    const parsed = Number(level_id);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [level_id]);

  const { data: trendingSongsResponse, isLoading: isTrendingLoading } = useTrendingLevelSongs(levelId);

  const songs = useMemo(() => trendingSongsResponse?.data ?? [], [trendingSongsResponse]);
  const playlists = useMemo(() => MOCK_PLAYLISTS, []);

  const closeMenu = useCallback(() => setMenuVisible(false), []);
  const toggleMenu = useCallback(() => {
    setMenuVisible((prev) => !prev);
  }, []);

  const clearFilters = () => setSelectedLanguages([]);

  const toggleLanguage = useCallback((lang: FilterLanguage) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        return prev.filter((item) => item !== lang);
      }
      return [...prev, lang];
    });
  }, []);

  const handleClosePlaylistModal = useCallback(() => {
    setPlaylistModalVisible(false);
    setActiveTrack(null);
    setDraftSelectedPlaylists(() => new Set());
  }, []);

  const handleOpenPlaylistModal = useCallback((track: SongRecord) => {
    if (!isAuthenticated) {
      setLoginPromptVisible(true);
      return;
    }
    const trackKey = `track-${track.id}`;
    const existingSelections = trackPlaylistMap[trackKey] ?? [];
    setDraftSelectedPlaylists(() => new Set(existingSelections));
    setActiveTrack(track);
    setPlaylistModalVisible(true);
  }, [isAuthenticated, trackPlaylistMap]);

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

  const handleTrackPress = useCallback((track: SongRecord) => {
    router.push({ pathname: '/song/[id]', params: { id: String(track.id), item: JSON.stringify(track) } });
  }, [router]);

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);

  const filteredSongs = useMemo(() => {
    if (selectedLanguages.length === 0) {
      return songs;
    }
    return songs.filter((track) => {
      const languageName = track.language?.name ?? '';
      return selectedLanguages.some((lang) => lang.toLowerCase() === languageName.toLowerCase());
    });
  }, [songs, selectedLanguages]);

  const chartTitle = name ?? detail?.cardTitle ?? detail?.heading ?? 'Chart';
  const chartLevel = level ?? detail?.cardSubtitle ?? '';
  const heading = detail?.heading ?? chartTitle;
  const description = detail?.description ?? 'Weekly highlights';

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
          gap: 20,
        },
        headerRow: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        coverCard: {
          width: 104,
          height: 104,
          borderRadius: 20,
          padding: 14,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        },
        coverTitle: {
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          color: theme.colors.onSurface,
        },
        coverSubtitle: {
          fontWeight: '700',
          textAlign: 'center',
          color: theme.colors.secondary,
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
        descriptionText: {
          color: theme.colors.onSurfaceVariant,
        },
        filterRow: {
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 20,
        },
        menuAnchor: {
          flex: 1,
        },
        menuPressable: {
          flex: 1,
        },
        filterInput: {},
        menuContent: {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.secondary,
          borderWidth: 1,
        },
        filtersRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: -8,
          paddingLeft: 4,
        },
        section: {
          gap: 16,
          zIndex: 1,
        },
        levelBadge: {
          alignSelf: 'flex-start',
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.colors.secondaryContainer,
        },
        levelBadgeText: {
          color: theme.colors.onSecondaryContainer,
          fontWeight: '600',
          letterSpacing: 0.3,
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
          fontSize: 14,
        },
      }),
    [
      theme.colors.onSurface,
      theme.colors.background,
      theme.colors.secondary,
      theme.colors.onSecondaryContainer,
      theme.colors.secondaryContainer,
      theme.colors.onSurfaceVariant
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: heading,
          headerRight: () => (
            <IconButton
              icon="share-variant"
              size={22}
              onPress={() => { }}
              accessibilityLabel="Share chart"
            />
          ),
        }}
      />
      <Animated.ScrollView
        entering={FadeInUp.duration(360)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.headerRow} entering={FadeInUp.delay(80).duration(320)}>
          <Surface style={styles.coverCard} elevation={themePreference === 'dark' ? 1 : 2}>
            <Text style={styles.coverTitle}>{chartTitle}</Text>
            {!!chartLevel && <Text style={styles.coverSubtitle}>{chartLevel}</Text>}
          </Surface>
          <View style={styles.headerInfo}>
            <Text style={styles.headingText}>{heading}</Text>
            <Text style={styles.descriptionText}>{description}</Text>
            {!!chartLevel && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{chartLevel}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View style={styles.filterRow} entering={FadeInUp.delay(120).duration(320)}>
          <View style={styles.menuAnchor}>
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchorPosition="bottom"
              contentStyle={styles.menuContent}
              anchor={
                <Pressable
                  onPress={toggleMenu}
                  style={styles.menuPressable}
                  accessibilityLabel="Filter languages"
                  accessibilityState={{ expanded: menuVisible }}>
                  <TextInput
                    mode="outlined"
                    value={selectedLanguages.join(', ')}
                    placeholder="Filter languages"
                    editable={false}
                    showSoftInputOnFocus={false}
                    left={<TextInput.Icon icon="filter-variant" onPress={toggleMenu} forceTextInputFocus={false} />}
                    style={styles.filterInput}
                    dense
                    pointerEvents="box-none"
                  />
                </Pressable>
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
              <Menu.Item onPress={() => { clearFilters(); closeMenu(); }} title="Clear languages" leadingIcon="close" />
            </Menu>
          </View>
        </Animated.View>

        {selectedLanguages.length > 0 && (
          <Animated.View style={styles.filtersRow} entering={FadeInUp.delay(160).duration(300)}>
            {selectedLanguages.map((lang) => (
              <Chip
                key={lang}
                onClose={() => toggleLanguage(lang)}>
                {lang}
              </Chip>
            ))}
          </Animated.View>
        )}

        <Animated.View style={styles.section} entering={FadeInUp.delay(200).duration(340)}>
          {isTrendingLoading ? (
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
      />
      <LoginRequiredDialog
        visible={loginPromptVisible}
        onDismiss={handleDismissLoginPrompt}
        onLogin={handleNavigateToLogin}
      />
    </SafeAreaView>
  );
}
