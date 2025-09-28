import React from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityRole={props.accessibilityRole}
      testID={props.testID}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPress?.(e);
      }}
      onLongPress={props.onLongPress}
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      style={props.style as any}
    >
      {props.children}
    </Pressable>
  );
}
