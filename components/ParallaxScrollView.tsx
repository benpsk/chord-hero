import { useRef } from 'react';
import { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, interpolateColor, Extrapolation } from 'react-native-reanimated';
import { Platform, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';

const HEADER_HEIGHT = 250;

type Props = {
  headerImage: React.ReactNode;
  headerBackgroundColor: { dark: string; light: string };
  children: React.ReactNode;
};

export default function ParallaxScrollView({ children, headerImage, headerBackgroundColor }: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        scrollOffset.value,
        [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
        [headerBackgroundColor.light, headerBackgroundColor.light, 'transparent']
      ),
    };
  });

  const headerTitleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: scrollOffset.value > HEADER_HEIGHT ? 1 : 0,
    };
  }, [scrollOffset.value]);

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView ref={scrollRef} scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}>
        {children}
      </Animated.ScrollView>
      <Animated.View style={[styles.header, headerAnimatedStyle]}> {headerImage} </Animated.View>
      <Animated.View style={[styles.headerTitle, headerTitleAnimatedStyle]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    position: 'absolute',
    top: Platform.select({ ios: 44, android: 48, default: 64 }),
    left: 16,
  },
});

