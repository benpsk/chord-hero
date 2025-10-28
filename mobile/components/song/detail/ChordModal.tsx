import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Modal, Portal, Surface, Text, useTheme } from 'react-native-paper';

import { ChordDiagramCarousel } from '@/components/ChordDiagramCarousel';
import type { GuitarChord } from '@/constants/chords';

export type ChordModalState = {
  name: string;
  chord?: GuitarChord;
} | null;

type ChordModalProps = {
  data: ChordModalState;
  onDismiss: () => void;
};

export function ChordModal({ data, onDismiss }: ChordModalProps) {
  const theme = useTheme();
  const positions = data?.chord?.positions ?? [];

  return (
    <Portal>
      <Modal visible={Boolean(data)} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <Surface style={[styles.surface, { backgroundColor: theme.colors.elevation.level2 }]} elevation={3}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text variant="titleMedium">{data?.chord?.name ?? data?.name}</Text>
              {positions.length ? (
                <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                  Swipe to explore fingerings
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" onPress={onDismiss} accessibilityLabel="Close chord diagrams" />
          </View>
          {positions.length ? (
            <ChordDiagramCarousel positions={positions} />
          ) : (
            <View style={styles.emptyState}>
              <Text
                variant="bodyMedium"
                style={[styles.emptyStateLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                No diagrams available yet for {data?.name}.
              </Text>
            </View>
          )}
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
  },
  surface: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  helperText: {
    textAlign: 'left',
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateLabel: {
    textAlign: 'center',
  },
});
