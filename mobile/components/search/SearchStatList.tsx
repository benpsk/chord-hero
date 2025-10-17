import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

export type SearchStatItem = {
  id: string;
  label: string;
  count: number;
};

type SearchStatListProps = {
  items: SearchStatItem[];
  unitLabel?: string;
  baseDelay?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
};

export function SearchStatList({
  items,
  unitLabel = 'songs',
  baseDelay = 200,
  isFetchingNextPage = false,
  hasNextPage = false,
}: SearchStatListProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          gap: 8,
        },
        row: {
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.tertiary,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        name: {
          fontSize: 16,
          fontWeight: '700',
        },
        meta: {
          marginTop: 6,
          fontSize: 13,
        },
        loadingMore: {
          paddingVertical: 16,
        },
        loadingText: {
          textAlign: 'center',
        },
      }),
    [theme.colors.tertiary]
  );

  return (
    <Animated.View style={styles.list} entering={FadeInUp.delay(baseDelay).duration(340)}>
      {items.map((item, index) => (
        <Animated.View
          key={item.id}
          style={styles.row}
          entering={FadeInUp.delay(baseDelay + index * 40).duration(300)}>
          <Text variant="titleSmall" style={styles.name} numberOfLines={1}>
            {item.label}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {item.count} {unitLabel}
          </Text>
        </Animated.View>
      ))}
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
