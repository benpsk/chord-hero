import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Divider,
  HelperText,
  List,
  Modal,
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

type SongOption = {
  id: number | string;
  title: string;
  artists?: { name?: string | null }[] | null;
};

type Step = 'name' | 'songs';

type Props = {
  visible: boolean;
  step: Step;
  draftName: string;
  nameError: string;
  submitError: string | null;
  onChangeDraftName: (value: string) => void;
  onSubmitName: () => void;
  onCancel: () => void;
  isCreating: boolean;
  songSearch: string;
  onChangeSongSearch: (value: string) => void;
  isSongQueryFetching: boolean;
  isLoadingSongOptions: boolean;
  songOptions: SongOption[];
  selectedCount: number;
  onToggleSong: (id: number | string) => void;
  isSongSelected: (id: number | string) => boolean;
  onClearSelection: () => void;
  songSubmitError: string | null;
  onSubmitSongs: () => void;
  isSubmittingSongs: boolean;
  currentPlaylistName: string;
  songsErrorMessage: string;
};

export function CreatePlaylistFlowModal({
  visible,
  step,
  draftName,
  nameError,
  submitError,
  onChangeDraftName,
  onSubmitName,
  onCancel,
  isCreating,
  songSearch,
  onChangeSongSearch,
  isSongQueryFetching,
  isLoadingSongOptions,
  songOptions,
  selectedCount,
  onToggleSong,
  isSongSelected,
  onClearSelection,
  songSubmitError,
  onSubmitSongs,
  isSubmittingSongs,
  currentPlaylistName,
  songsErrorMessage,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalContainer: {
          marginHorizontal: 24,
          backgroundColor: theme.colors.surface,
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
        songList: {
          maxHeight: 360,
          marginTop: 12,
        },
        songListItem: {
          paddingHorizontal: 0,
        },
        songListTitle: {
          fontWeight: '600',
        },
        songListDescription: {
          fontSize: 12,
        },
        songSummaryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
        },
        selectionCounter: {
          fontSize: 12,
        },
        loadingState: {
          alignItems: 'center',
          gap: 12,
          paddingVertical: 32,
        },
        loadingLabel: {
          fontSize: 13,
        },
        emptyState: {
          alignItems: 'center',
          gap: 12,
          paddingVertical: 32,
        },
        emptyTitle: {
          fontSize: 16,
          fontWeight: '700',
        },
        emptyMessage: {
          fontSize: 12,
        },
      }),
    [theme.colors.surface]
  );

  let songsContent: React.ReactNode;

  if (isSongQueryFetching || isLoadingSongOptions) {
    songsContent = (
      <View style={styles.loadingState}>
        <ActivityIndicator animating size="small" />
        <Text style={styles.loadingLabel}>Loading songs...</Text>
      </View>
    );
  } else if (songOptions.length === 0) {
    songsContent = (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No songs found</Text>
        <Text style={styles.emptyMessage}>Try adjusting your search.</Text>
      </View>
    );
  } else {
    songsContent = (
      <ScrollView style={styles.songList} keyboardShouldPersistTaps="handled">
        {songOptions.map((song, index) => {
          const checked = isSongSelected(song.id);
          const artistLabel = Array.isArray(song.artists)
            ? song.artists
                .map((artist) => artist?.name)
                .filter((name): name is string => Boolean(name && name.trim()))
                .join(', ')
            : undefined;
          return (
            <View key={String(song.id)}>
              <List.Item
                title={song.title}
                description={artistLabel}
                onPress={() => onToggleSong(song.id)}
                right={() => (
                  <Checkbox
                    status={checked ? 'checked' : 'unchecked'}
                    onPress={() => onToggleSong(song.id)}
                  />
                )}
                style={styles.songListItem}
                titleStyle={styles.songListTitle}
                descriptionStyle={styles.songListDescription}
              />
              {index < songOptions.length - 1 && <Divider />}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.modalContainer}>
      {step === 'name' ? (
        <View>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New playlist</Text>
            <Text style={styles.modalSubtitle}>
              Give your playlist a clear name. We&apos;ll help you add songs next.
            </Text>
          </View>
          <TextInput
            label="Playlist name"
            mode="outlined"
            value={draftName}
            onChangeText={onChangeDraftName}
            error={Boolean(nameError || submitError)}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSubmitName}
          />
          {nameError ? (
            <HelperText type="error">{nameError}</HelperText>
          ) : submitError ? (
            <HelperText type="error">{submitError}</HelperText>
          ) : (
            <HelperText type="info">Keep it short and descriptive.</HelperText>
          )}
          <View style={styles.modalActions}>
            <Button onPress={onCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button mode="contained" onPress={onSubmitName} loading={isCreating} disabled={isCreating}>
              Continue
            </Button>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add songs</Text>
            <Text style={styles.modalSubtitle}>
              Select songs to include in {currentPlaylistName}. You can revisit this later.
            </Text>
          </View>
          <Searchbar
            placeholder="Search songs"
            value={songSearch}
            onChangeText={onChangeSongSearch}
            autoCorrect={false}
            autoCapitalize="none"
            loading={isSongQueryFetching}
          />
          {songsContent}
          <View style={styles.songSummaryRow}>
            <Text style={styles.selectionCounter}>{selectedCount} selected</Text>
            {selectedCount > 0 ? (
              <Button compact onPress={onClearSelection} disabled={isSubmittingSongs}>
                Clear
              </Button>
            ) : null}
          </View>
          {songSubmitError ? <HelperText type="error">{songSubmitError}</HelperText> : null}
          {!songSubmitError && (
            <HelperText type="info">You can add more songs later from the playlist.</HelperText>
          )}
          <View style={styles.modalActions}>
            <Button onPress={onCancel} disabled={isSubmittingSongs}>
              Skip for now
            </Button>
            <Button
              mode="contained"
              onPress={onSubmitSongs}
              loading={isSubmittingSongs}
              disabled={isSubmittingSongs || selectedCount === 0}
            >
              Add songs
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
