import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';

import { HomeSectionHeader } from './HomeSectionHeader';

export type PopularArtistItem = {
  id: string;
  name: string;
};

type PopularArtistsSectionProps = {
  items: PopularArtistItem[];
  onPressArtist: (artist: PopularArtistItem) => void;
  enteringDelay?: number;
};

export function PopularArtistsSection({
  items,
  onPressArtist,
  enteringDelay = 280,
}: PopularArtistsSectionProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        surface: {
          borderRadius: 24,
          padding: 20,
          gap: 16,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        avatar: {
          width: 54,
          height: 54,
          borderRadius: 27,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        },
        avatarText: {
          color: theme.colors.onPrimary,
          fontWeight: '700',
        },
        name: {
          fontWeight: '600',
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.onPrimary, theme.colors.primary, theme.colors.onSurfaceVariant]
  );

  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(360)}>
      <Surface style={styles.surface} elevation={1}>
        <HomeSectionHeader title="Popular artists" />
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No popular artists to show yet.</Text>
        ) : (
          items.map((artist, index) => (
            <Animated.View
              key={artist.id}
              entering={FadeInUp.delay(enteringDelay + 50 * index + 300).duration(320)}
            >
              <Pressable
                style={styles.row}
                android_ripple={{ color: theme.colors.surfaceVariant }}
                onPress={() => onPressArtist(artist)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {artist.name
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{artist.name}</Text>
                </View>
                <IconButton
                  icon="chevron-right"
                  onPress={() => onPressArtist(artist)}
                  iconColor={theme.colors.secondary}
                />
              </Pressable>
            </Animated.View>
          ))
        )}
      </Surface>
    </Animated.View>
  );
}
