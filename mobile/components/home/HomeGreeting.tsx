import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text, useTheme } from 'react-native-paper';

type HomeGreetingProps = {
  greeting: string;
  name: string;
};

export function HomeGreeting({ greeting, name }: HomeGreetingProps) {
  const theme = useTheme();

  return (
    <Animated.View style={styles.container} entering={FadeInDown.duration(320)}>
      <Text style={[styles.greeting, { color: theme.colors.secondary }]}>{greeting},</Text>
      <Text style={styles.name}>{name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  greeting: {
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
});
