import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useTrendingAlbums, useTrendingArtists, useTrendingSongs, type TrendingArtist } from '@/hooks/useHomeQueries';
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { WeeklyChartsSection, type WeeklyChartItem } from '@/components/home/WeeklyChartsSection';
import { HomeInsightsCard } from '@/components/home/HomeInsightsCard';
import { TrendingAlbumsSection, type TrendingAlbumItem } from '@/components/home/TrendingAlbumsSection';
import { PopularArtistsSection } from '@/components/home/PopularArtistsSection';
import { useAuth } from '@/hooks/useAuth';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { data: trendingSongsData } = useTrendingSongs();
  const { data: trendingAlbumsData } = useTrendingAlbums();
  const { data: trendingArtistsData } = useTrendingArtists();

  const displayName = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) :'Guest Musician';

  const weeklyCharts = useMemo(() => {
    const songs = trendingSongsData?.data ?? [];
    return songs
      .filter((item) => item && item.id != null && item.name)
      .map((item) => ({
        id: String(item.id),
        name: item.name,
        level_id: item.level_id,
        level: item.level,
        description: item.description ?? 'weekly updated',
      }));
  }, [trendingSongsData]);

  const trendingAlbums = useMemo(() => {
    const albums = trendingAlbumsData?.data ?? [];
    return albums
      .filter((item) => item && item.id != null && item.name)
      .map((item) => ({
        id: String(item.id),
        name: item.name,
        total: item.total ?? 0,
        releaseYear: item.release_year ?? null,
        artistNames:
          item.artists?.map((artist) => artist?.name).filter(Boolean).join(', ').substring(0, 20) || 'Various artists',
        artists: item.artists ?? [],
        writers: item.writers ?? [],
      }));
  }, [trendingAlbumsData]);

  const popularArtists = useMemo(() => {
    const artists = trendingArtistsData?.data ?? [];
    return artists
      .filter((item) => item && item.id != null && item.name)
      .map((item) => ({
        id: String(item.id),
        name: item.name,
      }));
  }, [trendingArtistsData]);

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
      }),
    [theme.colors.background]
  );

  const handleViewSaved = () => router.push('/(tabs)/playlist');
  const handleOpenChart = (item: WeeklyChartItem) =>
    router.push({
      pathname: '/chart/[id]',
      params: { id: item.id, name: item.name, level: item.level, level_id: String(item.level_id), description: item.description },
    });
  const handleOpenAlbum = (album: TrendingAlbumItem) => {
    router.push({
      pathname: '/album/[id]',
      params: {
        id: album.id,
        item: JSON.stringify(album)
      },
    });
  };
  const handleOpenArtist = (artist: TrendingArtist) => {
    router.push({
      pathname: '/artist/[id]',
      params: {
        id: String(artist.id),
        item: JSON.stringify({ id: String(artist.id), name: artist.name }),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(360)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <HomeGreeting greeting={getGreeting()} name={displayName} />

        <WeeklyChartsSection
          items={weeklyCharts}
          onPressViewSaved={handleViewSaved}
          onPressItem={handleOpenChart}
          enteringDelay={80}
        />

        <HomeInsightsCard enteringDelay={160} />

        <TrendingAlbumsSection
          items={trendingAlbums}
          onPressAlbum={handleOpenAlbum}
          enteringDelay={220}
        />

        <PopularArtistsSection
          items={popularArtists}
          onPressArtist={(artist) =>
            handleOpenArtist({ id: Number(artist.id), name: artist.name })
          }
          enteringDelay={280}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
