import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, ListRenderItemInfo, StyleSheet, View, ViewToken } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import type { GuitarChordPosition } from '@/constants/chords';
import { GuitarChordDiagram } from '@/components/GuitarChordDiagram';

type Props = {
  positions: GuitarChordPosition[];
};

const ITEM_WIDTH = 240;
const ITEM_SPACING = 12;

export const ChordDiagramCarousel: React.FC<Props> = ({ positions }) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60 }), []);
  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  const renderItem = useCallback(({ item }: ListRenderItemInfo<GuitarChordPosition>) => {
    return (
      <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]} elevation={2}>
        <GuitarChordDiagram position={item} />
      </Surface>
    );
  }, [theme.colors.elevation.level2]);

  return (
    <View>
      <FlatList
        data={positions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        snapToAlignment="start"
        contentContainerStyle={styles.listContent}
        pagingEnabled={positions.length > 1}
        onViewableItemsChanged={viewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
      />
      {positions.length > 1 ? (
        <Text variant="bodySmall" style={[styles.pagination, { color: theme.colors.onSurfaceVariant }]}>
          {activeIndex + 1} / {positions.length}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    width: ITEM_WIDTH,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  pagination: {
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ChordDiagramCarousel;
