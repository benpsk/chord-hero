import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { StyleProp, ViewStyle } from 'react-native';

type HomeSectionHeaderProps = {
  title: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function HomeSectionHeader({ title, action, style }: HomeSectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>{title}</Text>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
});
