import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

type LoginRequiredDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  onLogin: () => void;
  title?: string;
  message?: string;
};

export function LoginRequiredDialog({
  visible,
  onDismiss,
  onLogin,
  title = 'Login required',
  message = 'Please sign in to create custom bookmarks and save your progress.',
}: LoginRequiredDialogProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        dialog: {
          backgroundColor: theme.colors.surface,
        },
        title: {
          fontSize: 20,
          fontWeight: '600',
        },
        content: {
          marginTop: 4,
        },
        message: {
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.onSurfaceVariant, theme.colors.surface]
  );

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text style={styles.message}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Maybe later</Button>
          <Button mode="contained" onPress={onLogin}>
            Go to login
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default LoginRequiredDialog;
