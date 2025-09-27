import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Checkbox,
  Divider,
  FAB,
  HelperText,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { Colors } from '@/constants/Colors';
import { SONGS } from '@/constants/songs';
import { useColorScheme } from '@/hooks/useColorScheme';

type Library = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
};

type ModalStep = 'name' | 'songs';

export default function LibraryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const theme = useTheme();

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('name');
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(() => new Set<string>());

  const songMap = useMemo(() => new Map(SONGS.map((song) => [song.id, song])), []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
        },
        container: {
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 80,
          gap: 24,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        headingTitle: {
          color: palette.text,
          fontSize: 24,
          fontWeight: '700',
        },
        searchButton: {
          margin: 0,
        },
        libraryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
        },
        rowSpacing: {
          height: 12,
        },
        artwork: {
          width: 52,
          height: 52,
          borderRadius: 12,
          backgroundColor: colorScheme === 'dark' ? '#4338CA' : '#8B5CF6',
        },
        libraryInfo: {
          flex: 1,
          marginLeft: 16,
          gap: 6,
        },
        libraryTitle: {
          color: palette.text,
          fontSize: 16,
          fontWeight: '700',
        },
        librarySubtitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        librarySubtitle: {
          color: palette.icon,
          fontSize: 13,
        },
        chevronButton: {
          margin: 0,
        },
        inlineDivider: {
          marginTop: 12,
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        },
        emptyState: {
          alignItems: 'center',
          paddingVertical: 120,
          gap: 12,
          paddingHorizontal: 24,
        },
        emptyTitle: {
          color: palette.text,
          fontSize: 18,
          fontWeight: '700',
        },
        emptySubtitle: {
          color: palette.icon,
          fontSize: 14,
          textAlign: 'center',
        },
        fab: {
          position: 'absolute',
          right: 24,
          bottom: 32,
          backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#1F1F1F',
        },
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
          color: palette.text,
          fontSize: 20,
          fontWeight: '700',
        },
        modalSubtitle: {
          color: palette.icon,
          fontSize: 14,
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 12,
        },
        sectionSpacing: {
          height: 12,
        },
        songList: {
          maxHeight: 360,
          marginTop: 12,
        },
        songListItem: {
          paddingHorizontal: 0,
        },
        songListTitle: {
          color: palette.text,
          fontWeight: '600',
        },
        songListDescription: {
          color: palette.icon,
        },
        songStepSummary: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
        },
        selectionCounter: {
          color: palette.icon,
          fontSize: 14,
        },
      }),
    [colorScheme, palette, theme.colors.surface]
  );

  const resetModalState = useCallback(() => {
    setAddModalVisible(false);
    setModalStep('name');
    setDraftName('');
    setNameError('');
    setSelectedSongIds(new Set<string>());
  }, []);

  const openAddModal = useCallback(() => {
    setAddModalVisible(true);
    setModalStep('name');
    setDraftName('');
    setNameError('');
    setSelectedSongIds(new Set<string>());
  }, []);

  const handleNameContinue = useCallback(() => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError('Library name is required');
      return;
    }

    setNameError('');
    setModalStep('songs');
  }, [draftName]);

  const toggleSongSelection = useCallback((id: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreateLibrary = useCallback(() => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setModalStep('name');
      setNameError('Library name is required');
      return;
    }

    const songIds = Array.from(selectedSongIds);

    const newLibrary: Library = {
      id: `library-${Date.now()}`,
      name: trimmed,
      songIds,
      createdAt: Date.now(),
    };

    setLibraries((prev) => [newLibrary, ...prev]);
    resetModalState();
  }, [draftName, resetModalState, selectedSongIds]);

  const libraryContent = useMemo(() => {
    if (libraries.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No libraries yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a custom library to organize songs for your next performance or study session.
          </Text>
          <Button mode="contained" icon="plus" onPress={openAddModal}>
            Create a library
          </Button>
        </View>
      );
    }

    return (
      <View>
        {libraries.map((library, index) => {
          const songs = library.songIds
            .map((id) => songMap.get(id))
            .filter(Boolean);
          const primaryArtist = songs.find((song) => song?.artist)?.artist ?? 'You';

          return (
            <TouchableRipple key={library.id} onPress={() => {}} borderless={false}>
              <View>
                {index > 0 && <View style={styles.rowSpacing} />}
                <View style={styles.libraryRow}>
                  <View style={styles.artwork} />
                  <View style={styles.libraryInfo}>
                    <Text style={styles.libraryTitle}>{library.name}</Text>
                    <View style={styles.librarySubtitleRow}>
                      <Text style={styles.librarySubtitle}>{primaryArtist}</Text>
                      <Text style={styles.librarySubtitle}>•</Text>
                      <Text style={styles.librarySubtitle}>
                        {library.songIds.length} song{library.songIds.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    size={22}
                    style={styles.chevronButton}
                    onPress={() => {}}
                  />
                </View>
                {index < libraries.length - 1 && <Divider style={styles.inlineDivider} />}
              </View>
            </TouchableRipple>
          );
        })}
      </View>
    );
  }, [libraries, openAddModal, songMap, styles]);

  const selectedCount = selectedSongIds.size;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headingTitle}>Your Library</Text>
          <IconButton
            icon="magnify"
            size={22}
            onPress={() => {}}
            style={styles.searchButton}
          />
        </View>

        {libraryContent}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        color="white"
      />

      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={resetModalState}
          contentContainerStyle={styles.modalContainer}
        >
          {modalStep === 'name' ? (
            <View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New library</Text>
                <Text style={styles.modalSubtitle}>
                  Give your library a clear name so it is easy to find later.
                </Text>
              </View>
              <TextInput
                label="Library name"
                mode="outlined"
                value={draftName}
                onChangeText={(value) => {
                  setDraftName(value);
                  if (nameError) {
                    setNameError('');
                  }
                }}
                error={Boolean(nameError)}
                autoFocus
              />
              {Boolean(nameError) && <HelperText type="error">{nameError}</HelperText>}
              <View style={styles.sectionSpacing} />
              <View style={styles.modalActions}>
                <Button onPress={resetModalState}>Cancel</Button>
                <Button mode="contained" onPress={handleNameContinue}>
                  Continue
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select songs</Text>
                <Text style={styles.modalSubtitle}>
                  Choose the songs you want to include in “{draftName.trim()}”.
                </Text>
              </View>
              <ScrollView style={styles.songList}>
                {SONGS.map((song, index) => {
                  const checked = selectedSongIds.has(song.id);
                  return (
                    <View key={song.id}>
                      <List.Item
                        title={song.title}
                        description={song.artist}
                        onPress={() => toggleSongSelection(song.id)}
                        right={() => (
                          <Checkbox
                            status={checked ? 'checked' : 'unchecked'}
                            onPress={() => toggleSongSelection(song.id)}
                          />
                        )}
                        style={styles.songListItem}
                        titleStyle={styles.songListTitle}
                        descriptionStyle={styles.songListDescription}
                      />
                      {index < SONGS.length - 1 && <Divider />}
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.songStepSummary}>
                <Button onPress={() => setModalStep('name')}>Back</Button>
                <Text style={styles.selectionCounter}>
                  {selectedCount} selected
                </Text>
              </View>
              <View style={styles.modalActions}>
                <Button onPress={resetModalState}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={handleCreateLibrary}
                  disabled={selectedCount === 0}
                >
                  Save library
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}
