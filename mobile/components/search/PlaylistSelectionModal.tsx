import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Checkbox, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import type { Playlist } from '@/constants/playlists';

type PlaylistSelectionModalProps = {
  visible: boolean;
  trackTitle?: string;
  playlists: Playlist[];
  selectedIds: Set<string>;
  onTogglePlaylist: (playlistId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PlaylistSelectionModal({
  visible,
  trackTitle,
  playlists,
  selectedIds,
  onTogglePlaylist,
  onConfirm,
  onCancel,
}: PlaylistSelectionModalProps) {
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
        subtitle: {
          marginBottom: 12,
          color: theme.colors.onSurfaceVariant,
        },
        listWrapper: {
          maxHeight: 280,
        },
        checkboxLabel: {
          flexShrink: 1,
        },
      }),
    [theme.colors.onSurfaceVariant, theme.colors.surface]
  );

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Save to playlist</Dialog.Title>
        <Dialog.Content>
          {!!trackTitle && <Text style={styles.subtitle}>{trackTitle}</Text>}
          <ScrollView style={styles.listWrapper}>
            {playlists.map((playlist) => (
              <Checkbox.Item
                key={playlist.id}
                label={playlist.name}
                labelStyle={styles.checkboxLabel}
                status={selectedIds.has(playlist.id) ? 'checked' : 'unchecked'}
                onPress={() => onTogglePlaylist(playlist.id)}
              />
            ))}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button mode="contained" onPress={onConfirm}>
            Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
