import React, { memo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

type ListFooterProps = {
  isLoading: boolean;
};

const ListFooterLoadingIndicator = ({ isLoading }: ListFooterProps) => {
  // If we're not loading, render nothing.
  if (!isLoading) {
    return null;
  }
  return (
    <View style={styles.loadingMore}>
      <ActivityIndicator animating size="small" />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingMore: {
    paddingVertical: 16,
  },
});

export default memo(ListFooterLoadingIndicator);
