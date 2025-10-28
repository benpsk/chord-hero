import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, SegmentedButtons, Surface, Text, useTheme } from 'react-native-paper';

type GuideDifficulty = 'easy' | 'medium' | 'hard';

type GuideModalProps = {
  visible: boolean;
  difficulty: GuideDifficulty;
  onChangeDifficulty: (value: GuideDifficulty) => void;
  onSubmit: () => void;
  onDismiss: () => void;
};

export function GuideModal({
  visible,
  difficulty,
  onChangeDifficulty,
  onSubmit,
  onDismiss,
}: GuideModalProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <Surface style={[styles.surface, { backgroundColor: theme.colors.elevation.level2 }]} elevation={2}>
          <View style={styles.section}>
            <Text variant="titleSmall">Difficulty Level</Text>
            <SegmentedButtons
              value={difficulty}
              onValueChange={(value) => {
                if (value === 'easy' || value === 'medium' || value === 'hard') {
                  onChangeDifficulty(value);
                }
              }}
              buttons={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
          </View>
          <View style={styles.actions}>
            <Button mode="contained" onPress={onSubmit} accessibilityLabel="Submit difficulty">
              Submit
            </Button>
          </View>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
