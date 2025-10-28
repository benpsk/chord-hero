import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Button, Card, IconButton, Text, useTheme } from 'react-native-paper';

import { HomeSectionHeader } from './HomeSectionHeader';

export type WeeklyChartItem = {
  id: string;
  name: string;
  level_id: number;
  level: string;
  description: string;
};

type WeeklyChartsSectionProps = {
  items: WeeklyChartItem[];
  onPressViewSaved: () => void;
  onPressItem: (item: WeeklyChartItem) => void;
  enteringDelay?: number;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(240, SCREEN_WIDTH * 0.7);

export function WeeklyChartsSection({
  items,
  onPressViewSaved,
  onPressItem,
  enteringDelay = 80,
}: WeeklyChartsSectionProps) {
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
        },
        cardContent: {
          gap: 12,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        footerText: {
          color: theme.colors.secondary,
          fontSize: 12,
          fontWeight: '600',
        },
        footerIcon: {
          margin: -12,
        },
        subtitle: {
          color: theme.colors.secondary,
        },
        title: {
          color: theme.colors.primary,
        },
        description: {
          color: theme.colors.secondary,
        },
        emptyState: {
          paddingVertical: 12,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.primary, theme.colors.secondary, theme.colors.onSurfaceVariant]
  );

  const headerAction = (
    <Button compact mode="text" onPress={onPressViewSaved}>
      View saved
    </Button>
  );

  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(360)}>
      <View style={styles.container}>
        <HomeSectionHeader title="Weekly charts" action={headerAction} />
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No trending songs yet. Check back soon.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {items.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(enteringDelay + 40 * index + 120).duration(320)}
              >
                <Card
                  style={styles.card}
                  mode="elevated"
                  onPress={() => onPressItem(item)}
                >
                  <Card.Content style={styles.cardContent}>
                    <Text variant="labelLarge" style={styles.subtitle}>
                      {item.level}
                    </Text>
                    <Text variant="headlineSmall" numberOfLines={1} style={styles.title}>
                      {item.name}
                    </Text>
                    <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
                      {item.description}
                    </Text>
                    <View style={styles.footer}>
                      <Text style={styles.footerText}>Tap to view details</Text>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        onPress={() => onPressItem(item)}
                        iconColor={theme.colors.secondary}
                        style={styles.footerIcon}
                      />
                    </View>
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
