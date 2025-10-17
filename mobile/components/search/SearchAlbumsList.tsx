import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

export type SearchAlbumItem = {
  id: string;
  title: string;
  artist: string;
  trackCount: number;
};

type SearchAlbumsListProps = {
  albums: SearchAlbumItem[];
  bookmarkedItems: Set<string>;
  onToggleBookmark: (key: string) => void;
  baseDelay?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
};

export function SearchAlbumsList({
  albums,
  bookmarkedItems,
  onToggleBookmark,
  baseDelay = 200,
  isFetchingNextPage = false,
  hasNextPage = false,
}: SearchAlbumsListProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          gap: 8,
        },
        albumRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.tertiary,
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
        albumMeta: {
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
      }),
    [theme.colors.onSecondary, theme.colors.secondary, theme.colors.tertiary]
  );

  return (
    <Animated.View style={styles.list} entering={FadeInUp.delay(baseDelay).duration(340)}>
      {albums.map((album, index) => {
        const albumKey = `album-${album.id}`;
        const isBookmarked = bookmarkedItems.has(albumKey);
        return (
          <Animated.View
            key={album.id}
            style={styles.albumRow}
            entering={FadeInUp.delay(baseDelay + index * 40).duration(300)}>
            <View style={styles.trackInfo}>
              <Text variant="titleSmall" style={styles.trackTitle} numberOfLines={1}>
                {album.title}
              </Text>
              <Text variant="bodySmall" style={styles.trackMetaLine} numberOfLines={1}>
                {album.artist}
              </Text>
            </View>
            <View style={styles.albumMeta}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>{album.trackCount}</Text>
              </View>
              <IconButton
                icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                iconColor={isBookmarked ? theme.colors.primary : theme.colors.secondary}
                style={styles.iconButton}
                onPress={() => onToggleBookmark(albumKey)}
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              />
            </View>
          </Animated.View>
        );
      })}
      {isFetchingNextPage ? (
        <View style={styles.loadingMore}>
          <ActivityIndicator animating size="small" />
        </View>
      ) : null}
      {!isFetchingNextPage && hasNextPage ? (
        <View style={styles.loadingMore}>
          <Text variant="bodySmall" style={styles.loadingText}>
            Scroll to load more…
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
