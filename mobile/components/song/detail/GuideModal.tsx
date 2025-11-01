import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Surface, Text, useTheme, ActivityIndicator, SegmentedButtons } from 'react-native-paper';

type GuideModalProps = {
  visible: boolean;
  levels: { id: number; name: string }[];
  selectedLevelId: number | null;
  onSelectLevel: (id: number | null) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  isLoading: boolean;
  isSubmitting?: boolean;
  canSubmit?: boolean;
};

const GuideModalComponent: React.FC<GuideModalProps> = ({
  visible,
  levels,
  selectedLevelId,
  onSelectLevel,
  onSubmit,
  onDismiss,
  isLoading,
  isSubmitting,
  canSubmit = true,
}) => {
  const theme = useTheme();
  const buttonConfig = React.useMemo(
    () =>
      levels.map((level) => ({
        value: String(level.id),
        label: level.name,
        disabled: isSubmitting,
      })),
    [isSubmitting, levels]
  );
  const handleValueChange = React.useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === '') {
        return;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        return;
      }
      onSelectLevel(parsed);
    },
    [onSelectLevel]
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <Surface style={[styles.surface, { backgroundColor: theme.colors.elevation.level2 }]} elevation={2}>
          <View style={styles.section}>
            <Text variant="titleSmall">Difficulty Level</Text>
            {isLoading ? (
              <ActivityIndicator animating />
            ) : buttonConfig.length > 0 ? (
              <SegmentedButtons
                value={selectedLevelId != null ? String(selectedLevelId) : ''}
                onValueChange={handleValueChange}
                buttons={buttonConfig}
              />
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Levels are not available yet.
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <Button mode="text" onPress={onDismiss} accessibilityLabel="Cancel level selection" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={onSubmit}
              accessibilityLabel="Submit difficulty"
              disabled={!canSubmit || buttonConfig.length === 0 || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Submit'}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

GuideModalComponent.displayName = 'GuideModal';

export const GuideModal = React.memo(GuideModalComponent);

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
    gap: 8,
  },
});
