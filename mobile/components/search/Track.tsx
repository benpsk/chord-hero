import React from 'react';
import { Pressable, View } from 'react-native';
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
  styles: any
};

// We pass the styles object as a prop for performance
export function Track({
  item,
  bookmarkedItems,
  onToggleBookmark,
  onPressTrack,
  styles,
}: TrackItemProps) {
  const theme = useTheme();

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
}
