import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { POPULAR_ARTISTS, TRENDING_ALBUMS, WEEKLY_CHARTS } from '@/constants/home';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_CARD_WIDTH = Math.min(240, SCREEN_WIDTH * 0.7);

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollContent: {
          paddingHorizontal: 24,
          paddingBottom: 120,
          paddingTop: 16,
          gap: 32,
        },
        greetingBlock: {
          gap: 6,
        },
        greetingText: {
          color: theme.colors.secondary,
          fontSize: 16,
          fontWeight: '500',
        },
        greetingName: {
          fontSize: 32,
          fontWeight: '700',
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        sectionTitle: {
          fontSize: 20,
          fontWeight: '500',
        },
        horizontalList: {
          flexDirection: 'row',
          gap: 16,
        },
        chartCard: {
          width: HORIZONTAL_CARD_WIDTH,
          borderRadius: 24,
        },
        cardContent: {
          gap: 12,
        },
        cardFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        cardFooterText: {
          color: theme.colors.secondary,
          fontSize: 13,
          fontWeight: '600',
        },
        cardFooterIcon: {
          margin: -12,
        },
        insightsSurface: {
          borderRadius: 28,
          padding: 24,
          gap: 20,
        },
        insightRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        insightLabel: {
          fontSize: 14,
        },
        insightValue: {
          fontSize: 18,
          fontWeight: '700',
          color: theme.colors.tertiary,
        },
        albumCard: {
          width: Math.min(240, SCREEN_WIDTH * 0.7),
          borderRadius: 24,
          overflow: 'hidden',
        },
        albumCover: {
          height: 80,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.secondary,
        },
        albumInitials: {
          fontSize: 32,
          fontWeight: '800',
          color: theme.colors.background
        },
        albumContent: {
          gap: 8,
          paddingTop: 14,
        },
        albumHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        albumTitle: {
          color: theme.colors.secondary,
          fontSize: 18,
          fontWeight: '700',
        },
        albumSubtitle: {
          fontSize: 14,
          fontWeight: '500',
        },
        artistCard: {
          borderRadius: 24,
          padding: 20,
          gap: 16,
        },
        artistRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        artistAvatar: {
          width: 54,
          height: 54,
          borderRadius: 27,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        },
        artistName: {
          fontSize: 16,
          fontWeight: '600',
        },
        mutedSubtitle: {
          color: theme.colors.secondary,
          fontSize: 13,
        },
      }),
    [theme.colors.background, theme.colors.primary, theme.colors.secondary, theme.colors.tertiary]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(360)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.greetingBlock} entering={FadeInDown.duration(320)}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.greetingName}>Ashley Scott</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).duration(360)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly charts</Text>
            <Button compact mode="text" onPress={() => router.push('/(tabs)/library')}>
              View saved
            </Button>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {WEEKLY_CHARTS.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInUp.delay(120 + index * 40).duration(320)}>
                <Card
                  style={styles.chartCard}
                  mode="elevated"
                  onPress={() => router.push({ pathname: '/chart/[id]', params: { id: item.id } })}>
                  <Card.Content style={styles.cardContent}>
                    <Text variant="labelLarge" style={{ color: theme.colors.secondary }}>
                      {item.subtitle}
                    </Text>
                    <Text variant="headlineSmall" style={{ color: theme.colors.primary }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.secondary }} numberOfLines={2}>
                      Curated for your team • Updated weekly
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardFooterText}>Tap to view details</Text>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        onPress={() => router.push({ pathname: '/chart/[id]', params: { id: item.id } })}
                        iconColor={theme.colors.secondary}
                        style={styles.cardFooterIcon}
                      />
                    </View>
                  </Card.Content>
                </Card>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(360)}>
          <Surface style={styles.insightsSurface} elevation={1}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>This week&apos;s insights</Text>
              <IconButton
                icon="dots-horizontal"
                onPress={() => { }}
                size={22}
                iconColor={theme.colors.secondary}
              />
            </View>
            <View style={styles.insightRow}>
              <View>
                <Text style={styles.insightLabel}>Hours rehearsed</Text>
                <Text style={styles.insightValue}>12h 45m</Text>
              </View>
              <Button icon="arrow-up-bold" mode="text" textColor={theme.colors.tertiary} compact>
                +8% vs last week
              </Button>
            </View>
            <View style={styles.insightRow}>
              <View>
                <Text style={styles.insightLabel}>Most requested key</Text>
                <Text style={styles.insightValue}>G Major</Text>
              </View>
              <Button icon="music-clef-treble" mode="text" textColor={theme.colors.tertiary} compact>
                Worship Team
              </Button>
            </View>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(360)}>
          <View style={[styles.sectionHeader, { paddingBottom: 10 }]}>
            <Text style={styles.sectionTitle}>Trending albums</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {TRENDING_ALBUMS.map((album, index) => (
              <Animated.View key={album.id} entering={FadeInUp.delay(240 + index * 40).duration(320)}>
                <Card
                  style={styles.albumCard}
                  mode="elevated"
                  onPress={() => router.push({ pathname: '/chart/[id]', params: { id: album.id } })}>
                  <View style={styles.albumCover}>
                    <Text style={styles.albumInitials}>{album.title.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Card.Content style={styles.albumContent}>
                    <View style={styles.albumHeader}>
                      <Text style={styles.albumTitle}>{album.title}</Text>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        onPress={() => router.push({ pathname: '/chart/[id]', params: { id: album.id } })}
                        iconColor={theme.colors.secondary}
                        style={styles.cardFooterIcon}
                      />
                    </View>
                    <Text style={styles.albumSubtitle}>by {album.subtitle}</Text>
                  </Card.Content>
                </Card>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(280).duration(360)}>
          <Surface style={styles.artistCard} elevation={1}>
            <Text style={styles.sectionTitle}>Popular artists</Text>
            {POPULAR_ARTISTS.map((artist, index) => (
              <Animated.View key={artist.id} style={styles.artistRow} entering={FadeInUp.delay(300 + index * 50).duration(320)}>
                <View style={styles.artistAvatar}>
                  <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                    {artist.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.artistName}>{artist.name}</Text>
                  <Text style={styles.mutedSubtitle}>Tap to explore arrangements and harmonies</Text>
                </View>
                <IconButton
                  icon="chevron-right"
                  onPress={() => router.push('/(tabs)/search')}
                  iconColor={theme.colors.secondary}
                />
              </Animated.View>
            ))}
          </Surface>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
