import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

export type SearchAlbumItem = {
  id: string;
  title: string;
  artist: string;
  trackCount: number;
  releaseYear?: number | null;
  artistDetails?: { id: number | string; name: string | null }[];
  writerDetails?: { id: number | string; name: string | null }[];
};

type SearchAlbumsListProps = {
  album: SearchAlbumItem;
  onPress?: (album: SearchAlbumItem) => void;
  baseDelay?: number;
};

export function Album({
  album,
  onPress,
  baseDelay = 200,
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
          paddingVertical: 10,
        },
        trackInfo: {
          flex: 1,
          gap: 4,
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
        loadingMore: {
          paddingVertical: 16,
        },
        loadingText: {
          textAlign: 'center',
        },
      }),
    [theme.colors.onSecondary, theme.colors.secondary]
  );

  return (
    <Animated.View entering={FadeInUp.delay(baseDelay + 40).duration(300)}>
      <TouchableRipple
        onPress={onPress ? () => onPress(album) : undefined}
        borderless={false}
        rippleColor={theme.colors.surfaceVariant}
      >
        <View style={styles.albumRow}>
          <View style={styles.trackInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {album.title}
            </Text>
            <Text variant="bodySmall" numberOfLines={1}>
              {album.artist}
            </Text>
          </View>
          <View style={styles.albumMeta}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{album.trackCount}</Text>
            </View>
          </View>
        </View>
      </TouchableRipple>
    </Animated.View>
  );
}
