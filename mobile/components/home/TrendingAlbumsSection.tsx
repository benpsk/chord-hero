import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';

import { HomeSectionHeader } from './HomeSectionHeader';

export type TrendingAlbumItem = {
  id: string;
  name: string;
  totalPlays: number;
  artists: string;
};

type TrendingAlbumsSectionProps = {
  items: TrendingAlbumItem[];
  onPressAlbum: (id: string) => void;
  enteringDelay?: number;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(240, SCREEN_WIDTH * 0.7);

export function TrendingAlbumsSection({
  items,
  onPressAlbum,
  enteringDelay = 220,
}: TrendingAlbumsSectionProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: 16,
        },
        listContent: {
          flexDirection: 'row',
          gap: 16,
        },
        card: {
          width: CARD_WIDTH,
          borderRadius: 24,
          overflow: 'hidden',
        },
        cover: {
          height: 80,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.secondary,
        },
        initials: {
          fontSize: 32,
          fontWeight: '800',
          color: theme.colors.background,
        },
        content: {
          gap: 8,
          paddingTop: 14,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        title: {
          color: theme.colors.secondary,
          fontWeight: '700',
        },
        subtitle: {
          fontSize: 12,
          fontWeight: '500',
        },
        footerIcon: {
          margin: -12,
        },
        emptyState: {
          paddingVertical: 12,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.background, theme.colors.onSurfaceVariant, theme.colors.secondary]
  );

  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(360)}>
      <View style={styles.container}>
        <HomeSectionHeader title="Trending albums" />
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No trending albums right now.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {items.map((album, index) => (
              <Animated.View
                key={album.id}
                entering={FadeInUp.delay(enteringDelay + 40 * index + 240).duration(320)}
              >
                <Card style={styles.card} mode="elevated" onPress={() => onPressAlbum(album.id)}>
                  <View style={styles.cover}>
                    <Text style={styles.initials}>{album.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Card.Content style={styles.content}>
                    <View style={styles.header}>
                      <Text style={styles.title}>{album.name}</Text>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        onPress={() => onPressAlbum(album.id)}
                        iconColor={theme.colors.secondary}
                        style={styles.footerIcon}
                      />
                    </View>
                    <Text style={styles.subtitle}>by {album.artists}</Text>
                  </Card.Content>
                </Card>
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}
