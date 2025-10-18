import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

type SearchEmptyStateProps = {
  title?: string;
  subtitle?: string;
  delay?: number;
  style?: ViewStyle;
};

export function SearchEmptyState({
  title = 'No data found!',
  subtitle = 'Unable to load data, please come back',
  delay = 200,
  style,
}: SearchEmptyStateProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          paddingVertical: 48,
          gap: 8,
        },
        title: {
          fontSize: 16,
          fontWeight: '600',
        },
        subtitle: {
          fontSize: 14,
          textAlign: 'center',
          color: theme.colors.secondary,
        },
      }),
    [theme.colors.secondary]
  );

  return (
    <Animated.View style={[styles.container, style]} entering={FadeInUp.delay(delay).duration(320)}>
      <Text variant="titleSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}
