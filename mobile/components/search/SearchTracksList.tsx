import React, { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Surface, Text, useTheme } from 'react-native-paper';

export type SearchTrackItem = {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  key?: string;
  level?: string;
};

type SearchTracksListProps = {
  tracks: SearchTrackItem[];
  bookmarkedItems: Set<string>;
  onToggleBookmark: (key: string) => void;
  onPressTrack: (id: string) => void;
  baseDelay?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onEndReached?: () => void;
};

export function SearchTracksList({
  tracks,
  bookmarkedItems,
  onToggleBookmark,
  onPressTrack,
  baseDelay = 200,
  isFetchingNextPage = false,
  hasNextPage = false,
  onEndReached,
}: SearchTracksListProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          gap: 8,
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
        loadingMore: {
          paddingVertical: 16,
        },
        loadingText: {
          textAlign: 'center',
        },
        listContainer: {
          gap: 8,
        },
      }),
    [theme.colors.onSecondary, theme.colors.secondary, theme.colors.tertiary]
  );

  const keyExtractor = useCallback((item: SearchTrackItem) => item.id, []);

  const renderItem: ListRenderItem<SearchTrackItem> = useCallback(
    ({ item }) => {
      const trackKey = `track-${item.id}`;
      const isBookmarked = bookmarkedItems.has(trackKey);
      return (
        <Surface style={styles.trackCard} elevation={0}>
          <Pressable
            style={styles.trackRipple}
            onPress={() => onPressTrack(item.id)}
            accessibilityLabel={`View details for ${item.title}`}>
            <View style={styles.trackRow}>
              <View style={styles.trackInfo}>
                <Text variant="titleSmall" style={styles.trackTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="bodySmall" style={styles.trackMetaLine} numberOfLines={1}>
                  {item.artist}
                  {item.composer ? ` | ${item.composer}` : ''}
                </Text>
              </View>
              <View style={styles.metaGroup}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{item.key ?? '—'}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{item.level ?? '—'}</Text>
                </View>
                <IconButton
                  icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  iconColor={isBookmarked ? theme.colors.primary : theme.colors.secondary}
                  style={styles.iconButton}
                  onPress={() => onToggleBookmark(trackKey)}
                  accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                />
              </View>
            </View>
          </Pressable>
        </Surface>
      );
    },
    [bookmarkedItems, onPressTrack, onToggleBookmark, styles, theme.colors.primary, theme.colors.secondary]
  );

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator animating size="small" />
        </View>
      );
    }
    if (hasNextPage) {
      return (
        <View style={styles.loadingMore}>
          <Text variant="bodySmall" style={styles.loadingText}>
            Scroll to load more…
          </Text>
        </View>
      );
    }
    return null;
  }, [hasNextPage, isFetchingNextPage, styles.loadingMore, styles.loadingText]);

  return (
    <FlatList
      data={tracks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContainer}
      nestedScrollEnabled
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
}
