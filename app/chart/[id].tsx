import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Chip, IconButton, Menu, TextInput } from 'react-native-paper';

import { Colors } from '@/constants/Colors';
import { FILTER_LANGUAGES, HOME_DETAILS, type FilterLanguage } from '@/constants/home';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ChartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const detail = id ? HOME_DETAILS[id] : undefined;

  const [selectedLanguages, setSelectedLanguages] = useState<FilterLanguage[]>(['English']);
  const [menuVisible, setMenuVisible] = useState(false);
  const [bookmarkedTracks, setBookmarkedTracks] = useState<Set<string>>(new Set());

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

  const toggleBookmark = useCallback((trackId: string) => {
    setBookmarkedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const filteredTracks = useMemo(() => {
    if (!detail) return [];
    if (selectedLanguages.length === 0) return detail.tracks;
    return detail.tracks.filter((track) => {
      if (!track.language) return true;
      return selectedLanguages.includes(track.language);
    });
  }, [detail, selectedLanguages]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
        },
        content: {
          paddingHorizontal: 24,
          paddingBottom: 48,
          paddingTop: 16,
          gap: 24,
        },
        topBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        topIcon: {
          padding: 4,
        },
        headerRow: {
          flexDirection: 'row',
          gap: 16,
          alignItems: 'center',
        },
        coverCard: {
          width: 120,
          height: 120,
          borderRadius: 20,
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(10,126,164,0.12)',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(10,126,164,0.25)',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        },
        coverTitle: {
          color: palette.text,
          fontSize: 20,
          fontWeight: '700',
          textAlign: 'center',
        },
        coverSubtitle: {
          color: palette.icon,
          fontSize: 16,
          fontWeight: '500',
          textAlign: 'center',
        },
        headingText: {
          color: palette.text,
          fontSize: 24,
          fontWeight: '700',
        },
        descriptionText: {
          color: palette.icon,
          fontSize: 15,
          marginTop: 4,
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
        filterInput: {
          backgroundColor: palette.background,
        },
        menuContent: {
          backgroundColor: palette.background,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : '#D1D5DB',
        },
        filtersRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: -8,
          paddingLeft: 4,
        },
        filterChip: {
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
        },
        section: {
          gap: 16,
          zIndex: 1,
        },
        trackCard: {
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
          paddingBottom: 12,
          marginBottom: 12,
        },
        trackRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        },
        trackInfo: {
          flex: 1,
        },
        trackTitle: {
          color: palette.text,
          fontSize: 16,
          fontWeight: '700',
        },
        trackDescription: {
          color: palette.icon,
          fontSize: 13,
          marginTop: 2,
        },
        trackActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        bookmarkButton: {
          margin: -8,
        },
        metaPill: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
        },
        metaText: {
          color: palette.text,
          fontSize: 12,
          fontWeight: '600',
        },
        emptyState: {
          alignItems: 'center',
          paddingVertical: 60,
        },
        emptyText: {
          color: palette.icon,
          fontSize: 16,
        },
      }),
    [colorScheme, palette]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.topIcon}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.topIcon}>
            <MaterialIcons name="share" size={20} color={palette.icon} />
          </Pressable>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.coverCard}>
            <Text style={styles.coverTitle}>{detail?.cardTitle ?? 'Top 50'}</Text>
            <Text style={styles.coverSubtitle}>{detail?.cardSubtitle ?? ''}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headingText}>{detail?.heading ?? 'Chart'}</Text>
            <Text style={styles.descriptionText}>{detail?.description ?? 'Weekly highlights'}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
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
                  accessibilityRole="button"
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
        </View>

        {selectedLanguages.length > 0 && (
          <View style={styles.filtersRow}>
            {selectedLanguages.map((lang) => (
              <Chip
                key={lang}
                mode="outlined"
                style={styles.filterChip}
                onClose={() => toggleLanguage(lang)}>
                {lang}
              </Chip>
            ))}
          </View>
        )}

        <View style={styles.section}>
          {filteredTracks.map((track) => (
            <View key={track.id} style={styles.trackCard}>
              <View style={styles.trackRow}>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackDescription} numberOfLines={1}>
                    {track.artists}
                  </Text>
                </View>
                <View style={styles.trackActions}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>{track.key}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>{track.difficulty}</Text>
                  </View>
                  <IconButton
                    icon={bookmarkedTracks.has(track.id) ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    iconColor={bookmarkedTracks.has(track.id) ? palette.tint : palette.icon}
                    onPress={() => toggleBookmark(track.id)}
                    accessibilityLabel={bookmarkedTracks.has(track.id) ? 'Remove bookmark' : 'Add bookmark'}
                    style={styles.bookmarkButton}
                  />
                </View>
              </View>
            </View>
          ))}
          {filteredTracks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tracks available yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
