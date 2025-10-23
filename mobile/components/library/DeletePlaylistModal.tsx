import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Modal, Text, useTheme } from 'react-native-paper';

type Props = {
  visible: boolean;
  playlistName?: string | null;
  errorMessage: string | null;
  loading: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function DeletePlaylistModal({
  visible,
  playlistName,
  errorMessage,
  loading,
  onDismiss,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Delete playlist</Text>
        <Text style={styles.modalSubtitle}>
          This action cannot be undone. We&apos;ll remove {playlistName ?? 'this playlist'} and its song assignments.
        </Text>
      </View>
      {errorMessage ? (
        <HelperText type="error">{errorMessage}</HelperText>
      ) : (
        <HelperText type="info">Your songs remain available in your library.</HelperText>
      )}
      <View style={styles.modalActions}>
        <Button onPress={onDismiss} disabled={loading}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={onConfirm}
          loading={loading}
          disabled={loading}
          buttonColor={theme.colors.error}
        >
          Delete
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
