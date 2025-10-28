import React from 'react';
import { Animated as RNAnimated, Pressable, StyleSheet, View } from 'react-native';
import type { PanResponderInstance } from 'react-native';

type ControlsPeekProps = {
  visible: boolean;
  opacity: RNAnimated.Value;
  outlineColor: string;
  onPress: () => void;
  panHandlers: PanResponderInstance['panHandlers'];
};

export function ControlsPeek({ visible, opacity, outlineColor, onPress, panHandlers }: ControlsPeekProps) {
  if (!visible) {
    return null;
  }

  return (
    <Pressable accessibilityLabel="Show controls" onPress={onPress} style={styles.touchable} {...panHandlers}>
      <RNAnimated.View style={{ opacity }}>
        <View style={[styles.handle, { backgroundColor: outlineColor }]} />
      </RNAnimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 64,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
