import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';

export type SearchTrackItem = {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  key?: string;
  level?: string;
};

type TrackItemProps = {
  item: SearchTrackItem;
  bookmarkedItems: Set<string>,
  onToggleBookmark: (key: string) => void;
  onPressTrack: (id: string) => void;
};

// We pass the styles object as a prop for performance
export function Track({
  item,
  bookmarkedItems,
  onToggleBookmark,
  onPressTrack,
}: TrackItemProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trackRipple: {
          paddingVertical: 10,
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
          fontWeight: '600',
        },
        iconButton: {
          margin: -8,
        },
      }),
    [theme.colors.onSecondary, theme.colors.secondary]
  );

  const trackKey = `track-${item.id}`;
  const isBookmarked = bookmarkedItems.has(trackKey);
  return (
    <Surface elevation={0} >
      <Pressable
        style={styles.trackRipple}
        onPress={() => onPressTrack(item.id)}
        accessibilityLabel={`View details for ${item.title}`}>
        <View style={styles.trackRow}>
          <View style={styles.trackInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {item.title}
            </Text>
            <Text variant="bodySmall" numberOfLines={1}>
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
}
