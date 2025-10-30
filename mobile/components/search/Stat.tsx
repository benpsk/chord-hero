import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

export type SearchStatItem = {
  id: string;
  name: string;
  total: number;
};

type SearchStatListProps = {
  item: SearchStatItem;
  unitLabel?: string;
  onPress?: (item: SearchStatItem) => void;
  baseDelay?: number;
};

export function Stat({
  item,
  unitLabel = 'songs',
  onPress,
  baseDelay = 200,
}: SearchStatListProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        meta: {
          marginTop: 6,
          fontSize: 13,
          color: theme.colors.onSurfaceVariant,
        },
        loadingMore: {
          paddingVertical: 16,
        },
        loadingText: {
          textAlign: 'center',
        },
      }),
    [theme.colors.onSurfaceVariant]
  );

  return (
    <Animated.View entering={FadeInUp.delay(baseDelay + 40).duration(300)}>
      <TouchableRipple
        onPress={onPress ? () => onPress(item) : undefined}
        borderless={false}
        rippleColor={theme.colors.surfaceVariant}
      >
        <Animated.View style={styles.row}>
          <Text variant="titleSmall" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {item.total ?? 0} {unitLabel}
          </Text>
        </Animated.View>
      </TouchableRipple>
    </Animated.View>
  );
}
