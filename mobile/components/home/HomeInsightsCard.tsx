import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Button, IconButton, Surface, Text, useTheme } from 'react-native-paper';

import { HomeSectionHeader } from './HomeSectionHeader';

type HomeInsightsCardProps = {
  enteringDelay?: number;
};

export function HomeInsightsCard({ enteringDelay = 160 }: HomeInsightsCardProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        surface: {
          borderRadius: 28,
          padding: 24,
          gap: 20,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        value: {
          fontWeight: '700',
          color: theme.colors.tertiary,
        },
      }),
    [theme.colors.tertiary]
  );

  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(360)}>
      <Surface style={styles.surface} elevation={1}>
        <HomeSectionHeader
          title="This week's insights"
          action={
            <IconButton
              icon="dots-horizontal"
              onPress={() => {}}
              size={22}
              iconColor={theme.colors.secondary}
            />
          }
        />

        <View style={styles.row}>
          <View>
            <Text>Hours rehearsed</Text>
            <Text style={styles.value}>12h 45m</Text>
          </View>
          <Button icon="arrow-up-bold" mode="text" textColor={theme.colors.tertiary} compact>
            +8% vs last week
          </Button>
        </View>

        <View style={styles.row}>
          <View>
            <Text>Most requested key</Text>
            <Text style={styles.value}>G Major</Text>
          </View>
          <Button icon="music-clef-treble" mode="text" textColor={theme.colors.tertiary} compact>
            Worship Team
          </Button>
        </View>
      </Surface>
    </Animated.View>
  );
}
