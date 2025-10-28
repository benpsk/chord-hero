import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Avatar, Text, useTheme } from 'react-native-paper';

type ProfileHeaderProps = {
  displayName: string;
  identityLabel: string;
  avatarLabel: string;
  accentColor: string;
  enteringDelay?: number;
};

export function ProfileHeader({
  displayName,
  identityLabel,
  avatarLabel,
  accentColor,
  enteringDelay = 0,
}: ProfileHeaderProps) {
  const theme = useTheme();
  return (
    <Animated.View style={styles.container} entering={FadeInDown.delay(enteringDelay).duration(320)}>
      <Avatar.Text
        label={avatarLabel}
        size={54}
        style={{ backgroundColor: accentColor }}
        color={theme.colors.onPrimary}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        <Text>{identityLabel}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontWeight: '700',
  },
});
