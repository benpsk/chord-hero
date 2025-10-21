import { SongRecord } from '@/hooks/useSongsSearch';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';

type TrackItemProps = {
  item: SongRecord;
  bookmarkedItems: Set<string>,
  onPressBookmark: (track: SongRecord) => void;
  onPressTrack: (item: SongRecord) => void;
};

// We pass the styles object as a prop for performance
export function Track({
  item,
  bookmarkedItems,
  onPressBookmark,
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
        onPress={() => onPressTrack(item)}
        accessibilityLabel={`View details for ${item.title}`}>
        <View style={styles.trackRow}>
          <View style={styles.trackInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {item.title}
            </Text>
            <Text variant="bodySmall" numberOfLines={1}>
              {item.artists?.map((artist) => artist?.name).filter(Boolean).join(', ') || 'Unknown artist'}
              {item.writers?.length || 0 > 0 ? " | " : ""}
              {item.writers?.map((writer) => writer?.name).filter(Boolean).join(', ') || undefined}
            </Text>
          </View>
          <View style={styles.metaGroup}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{item.key ?? '—'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{item.level?.name ?? '—'}</Text>
            </View>
            <IconButton
              icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              iconColor={isBookmarked ? theme.colors.primary : theme.colors.secondary}
              style={styles.iconButton}
              onPress={() => onPressBookmark(item)}
              accessibilityLabel="Manage playlists"
            />
          </View>
        </View>
      </Pressable>
    </Surface>
  );
}
