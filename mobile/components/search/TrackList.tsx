import React from 'react';
import { FlatList, type ListRenderItem, type StyleProp, type ViewStyle } from 'react-native';
import { Divider } from 'react-native-paper';

import type { SongRecord } from '@/hooks/useSongsSearch';

import { Track } from './Track';

type TrackListProps = {
  tracks: SongRecord[];
  bookmarkedItems: Set<string>;
  onPressBookmark: (track: SongRecord) => void;
  onPressTrack: (track: SongRecord) => void;
  showBookmark?: boolean;
  selectable?: boolean;
  selectedItems?: Set<number | string>;
  onToggleSelect?: (id: number | string) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListFooterComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  showsVerticalScrollIndicator?: boolean;
  scrollEnabled?: boolean;
};

export function TrackList({
  tracks,
  bookmarkedItems,
  onPressBookmark,
  onPressTrack,
  showBookmark = true,
  selectable = false,
  selectedItems,
  onToggleSelect,
  contentContainerStyle,
  onEndReached,
  onEndReachedThreshold = 0.5,
  ListFooterComponent,
  ListEmptyComponent,
  showsVerticalScrollIndicator = true,
  scrollEnabled = true,
}: TrackListProps) {
  const selectedSet = selectedItems ?? new Set<string>();

  const renderItem: ListRenderItem<SongRecord> = ({ item }) => (
    <Track
      item={item}
      bookmarkedItems={bookmarkedItems}
      onPressBookmark={onPressBookmark}
      onPressTrack={onPressTrack}
      showBookmark={showBookmark}
      selectable={selectable}
      selected={selectedSet.has(String(item.id))}
      onToggleSelect={onToggleSelect}
    />
  );

  return (
    <FlatList
      data={tracks}
      renderItem={renderItem}
      keyExtractor={(item) => `track-${item.id}`}
      ItemSeparatorComponent={Divider}
      contentContainerStyle={contentContainerStyle}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      scrollEnabled={scrollEnabled}
    />
  );
}
