import React, { useCallback } from 'react';
import { FlatList, type ListRenderItem, type StyleProp, type ViewStyle } from 'react-native';
import { Divider } from 'react-native-paper';

import type { SongRecord } from '@/hooks/useSongsSearch';

import { Track } from './Track';

type TrackListProps = {
  tracks: SongRecord[];
  bookmarkedItems: Set<string>;
  onPressBookmark: (track: SongRecord) => void;
  onPressTrack: (track: SongRecord) => void;
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
  contentContainerStyle,
  onEndReached,
  onEndReachedThreshold = 0.5,
  ListFooterComponent,
  ListEmptyComponent,
  showsVerticalScrollIndicator = true,
  scrollEnabled = true,
}: TrackListProps) {
  const renderItem = useCallback<ListRenderItem<SongRecord>>(
    ({ item }) => (
      <Track
        item={item}
        bookmarkedItems={bookmarkedItems}
        onPressBookmark={onPressBookmark}
        onPressTrack={onPressTrack}
      />
    ),
    [bookmarkedItems, onPressBookmark, onPressTrack]
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
