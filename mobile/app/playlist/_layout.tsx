import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { useAuth } from '@/hooks/useAuth';

export default function PlaylistLayout() {
  const { isAuthenticated, isChecking } = useAuth();
  const theme = useTheme();

  if (isChecking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
