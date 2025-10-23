import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Modal, Text, TextInput, useTheme } from 'react-native-paper';

type Props = {
  visible: boolean;
  value: string;
  nameError: string;
  submitError: string | null;
  onChange: (value: string) => void;
  onDismiss: () => void;
  onSubmit: () => void;
  loading: boolean;
};

export function EditPlaylistModal({
  visible,
  value,
  nameError,
  submitError,
  onChange,
  onDismiss,
  onSubmit,
  loading,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Rename playlist</Text>
        <Text style={styles.modalSubtitle}>
          Update the name so it better reflects the songs inside.
        </Text>
      </View>
      <TextInput
        label="Playlist name"
        mode="outlined"
        value={value}
        onChangeText={onChange}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        error={Boolean(nameError || submitError)}
      />
      {nameError ? (
        <HelperText type="error">{nameError}</HelperText>
      ) : submitError ? (
        <HelperText type="error">{submitError}</HelperText>
      ) : (
        <HelperText type="info">Keep it concise and recognizable.</HelperText>
      )}
      <View style={styles.modalActions}>
        <Button onPress={onDismiss} disabled={loading}>
          Cancel
        </Button>
        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading}>
          Save
        </Button>
      </View>
    </Modal>
  );
}

const createStyles = (colors: { [key: string]: string }) =>
  StyleSheet.create({
    modalContainer: {
      marginHorizontal: 24,
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 24,
      gap: 24,
    },
    modalHeader: {
      gap: 4,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    modalSubtitle: {
      fontSize: 12,
      marginBottom: 12,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
  });

