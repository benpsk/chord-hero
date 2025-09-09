import { BlurView, type BlurTint } from 'expo-blur';
import { StyleSheet, useColorScheme } from 'react-native';

import { useBottomTabOverflow } from './TabBarBackground';

export default function TabBarBackground() {
  const colorScheme = useColorScheme();
  const tabBarHeight = useBottomTabOverflow();

  return (
    <BlurView
      intensity={100}
      tint={(colorScheme ?? 'light') as BlurTint}
      style={[StyleSheet.absoluteFill, { height: 58 + tabBarHeight }]}
    />
  );
}

export { useBottomTabOverflow };
