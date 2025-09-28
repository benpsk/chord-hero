import React from 'react';
import Animated, { withRepeat, withSequence, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

export default function HelloWave() {
  const rotationAnimation = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotationAnimation.value}deg` }] }));

  React.useEffect(() => {
    rotationAnimation.value = withRepeat(withSequence(withTiming(-10, { duration: 150 }), withTiming(20, { duration: 300 }), withTiming(0, { duration: 150 })), 4);
  }, [rotationAnimation]);

  return <Animated.Text style={[styles.text, animatedStyle]}>👋</Animated.Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
  },
});

