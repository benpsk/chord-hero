import React, { useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { POPULAR_ARTISTS, TRENDING_ALBUMS, WEEKLY_CHARTS } from '@/constants/home';

const CARD_GAP = 16;
const ARTIST_GAP = 20;
const HORIZONTAL_PADDING = 24;
const SCREEN_WIDTH = Dimensions.get('window').width;
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const CARD_WIDTH = (AVAILABLE_WIDTH - CARD_GAP) / 2.5;
const ARTIST_WIDTH = SCREEN_WIDTH * 0.32;

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  const styles = useMemo(() =>
    StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: palette.background,
      },
      content: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: 110,
        paddingTop: 12,
      },
      greetingLabel: {
        color: palette.icon,
        fontSize: 16,
        marginBottom: 4,
      },
      greetingName: {
        color: palette.text,
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 24,
      },
      sectionTitle: {
        color: palette.text,
        fontSize: 18,
        fontWeight: '700',
      },
      sectionSpacing: {
        marginTop: 32,
      },
      horizontalList: {
        paddingTop: 16,
        paddingBottom: 8,
        paddingRight: HORIZONTAL_PADDING,
      },
      chartCard: {
        width: CARD_WIDTH,
        aspectRatio: 1,
        borderRadius: 20,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(10,126,164,0.12)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(10,126,164,0.25)',
      },
      cardSpacing: {
        marginRight: CARD_GAP,
      },
      cardPressed: {
        transform: [{ scale: 0.97 }],
      },
      cardHeading: {
        color: palette.text,
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
      },
      cardSubheading: {
        color: palette.icon,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
      },
      artistList: {
        paddingTop: 16,
        paddingBottom: 24,
        paddingRight: HORIZONTAL_PADDING,
      },
      artistContainer: {
        width: ARTIST_WIDTH,
        alignItems: 'center',
      },
      artistSpacing: {
        marginRight: ARTIST_GAP,
      },
      avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colorScheme === 'dark' ? '#111827' : '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
      },
      avatarInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#9CA3AF',
      },
      artistName: {
        textAlign: 'center',
        color: palette.text,
        fontSize: 14,
        fontWeight: '500',
      },
    }),
  [colorScheme, palette]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces>
        <Text style={styles.greetingLabel}>Good morning,</Text>
        <Text style={styles.greetingName}>Ashley Scott</Text>

        <Text style={styles.sectionTitle}>Weekly charts by levels</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_GAP}>
          {WEEKLY_CHARTS.map((item, index) => {
            const isLast = index === WEEKLY_CHARTS.length - 1;
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/chart/[id]', params: { id: item.id } })}
                style={({ pressed }) => [
                  styles.chartCard,
                  !isLast && styles.cardSpacing,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.cardHeading}>{item.title}</Text>
                <Text style={styles.cardSubheading}>{item.subtitle}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Trending albums</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_GAP}>
          {TRENDING_ALBUMS.map((item, index) => {
            const isLast = index === TRENDING_ALBUMS.length - 1;
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/chart/[id]', params: { id: item.id } })}
                style={({ pressed }) => [
                  styles.chartCard,
                  !isLast && styles.cardSpacing,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.cardHeading}>{item.title}</Text>
                <Text style={styles.cardSubheading}>{item.subtitle}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Popular artists</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.artistList}>
          {POPULAR_ARTISTS.map((artist, index) => {
            const isLast = index === POPULAR_ARTISTS.length - 1;
            return (
              <View
                key={artist.id}
                style={[styles.artistContainer, !isLast && styles.artistSpacing]}
              >
                <View style={styles.avatarPlaceholder}>
                  <View style={styles.avatarInner} />
                </View>
                <Text style={styles.artistName}>{artist.name}</Text>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
