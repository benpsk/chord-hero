import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Checkbox,
  Chip,
  HelperText,
  Menu,
  Modal,
  Portal,
  Searchbar,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

type Option = {
  label: string;
  value: string;
};

export default function LibraryNewPageScreen() {
  const theme = useTheme();

  const playlistOptions = useMemo<Option[]>(
    () => [
      { label: 'Uname Playlist 1', value: 'playlist-1' },
      { label: 'Uname Playlist 2', value: 'playlist-2' },
      { label: 'Uname Playlist 3', value: 'playlist-3' },
    ],
    []
  );

  const levelOptions = useMemo<Option[]>(
    () => [
      { label: 'Easy', value: 'easy' },
      { label: 'Medium', value: 'medium' },
      { label: 'Hard', value: 'hard' },
    ],
    []
  );

  const languageOptions = useMemo<Option[]>(
    () => [
      { label: 'English', value: 'en' },
      { label: 'Burmese', value: 'mm' },
    ],
    []
  );

  const albumOptions = useMemo<Option[]>(
    () => [
      { label: 'Sunrise Sessions', value: 'album-sunrise-sessions' },
      { label: 'Live at the Loft', value: 'album-live-loft' },
      { label: 'Midnight Drive', value: 'album-midnight-drive' },
      { label: 'Coastal Skies', value: 'album-coastal-skies' },
      { label: 'Evening Hymns', value: 'album-evening-hymns' },
    ],
    []
  );

  const artistOptions = useMemo<Option[]>(
    () => [
      { label: 'Uname 1', value: 'artist-uname-1' },
      { label: 'Uname 2', value: 'artist-uname-2' },
      { label: 'Uname 3', value: 'artist-uname-3' },
      { label: 'Skyline Duo', value: 'artist-skyline-duo' },
      { label: 'Golden Choir', value: 'artist-golden-choir' },
    ],
    []
  );

  const writerOptions = useMemo<Option[]>(
    () => [
      { label: 'Uname 1', value: 'writer-uname-1' },
      { label: 'Uname 2', value: 'writer-uname-2' },
      { label: 'Uname 3', value: 'writer-uname-3' },
      { label: 'Harper Lane', value: 'writer-harper-lane' },
      { label: 'Jordan West', value: 'writer-jordan-west' },
    ],
    []
  );

  const playlistLabelMap = useMemo(() => new Map(playlistOptions.map((option) => [option.value, option.label])), [playlistOptions]);
  const levelLabelMap = useMemo(() => new Map(levelOptions.map((option) => [option.value, option.label])), [levelOptions]);
  const languageLabelMap = useMemo(() => new Map(languageOptions.map((option) => [option.value, option.label])), [languageOptions]);
  const albumLabelMap = useMemo(() => new Map(albumOptions.map((option) => [option.value, option.label])), [albumOptions]);
  const artistLabelMap = useMemo(() => new Map(artistOptions.map((option) => [option.value, option.label])), [artistOptions]);
  const writerLabelMap = useMemo(() => new Map(writerOptions.map((option) => [option.value, option.label])), [writerOptions]);

  const [playlist, setPlaylist] = useState<string>(playlistOptions[0]?.value ?? '');
  const [title, setTitle] = useState('');
  const [key, setKey] = useState('');
  const [level, setLevel] = useState<string>(levelOptions[1]?.value ?? '');
  const [language, setLanguage] = useState<string>(languageOptions[0]?.value ?? '');
  const [releaseYear, setReleaseYear] = useState('');
  const [lyric, setLyric] = useState('');

  const [playlistMenuVisible, setPlaylistMenuVisible] = useState(false);
  const [levelMenuVisible, setLevelMenuVisible] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

  const [selectedAlbums, setSelectedAlbums] = useState<string[]>(['album-sunrise-sessions', 'album-live-loft']);
  const [selectedArtists, setSelectedArtists] = useState<string[]>(['artist-uname-1', 'artist-uname-2']);
  const [selectedWriters, setSelectedWriters] = useState<string[]>(['writer-uname-1', 'writer-jordan-west']);

  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [artistModalVisible, setArtistModalVisible] = useState(false);
  const [writerModalVisible, setWriterModalVisible] = useState(false);

  const [albumQuery, setAlbumQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [writerQuery, setWriterQuery] = useState('');

  const filteredAlbumOptions = useMemo(
    () =>
      albumOptions.filter((option) => option.label.toLowerCase().includes(albumQuery.trim().toLowerCase())),
    [albumOptions, albumQuery]
  );
  const filteredArtistOptions = useMemo(
    () =>
      artistOptions.filter((option) => option.label.toLowerCase().includes(artistQuery.trim().toLowerCase())),
    [artistOptions, artistQuery]
  );
  const filteredWriterOptions = useMemo(
    () =>
      writerOptions.filter((option) => option.label.toLowerCase().includes(writerQuery.trim().toLowerCase())),
    [writerOptions, writerQuery]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollView: {
          flex: 1,
        },
        content: {
          paddingHorizontal: 24,
          paddingVertical: 24,
          paddingBottom: 160,
          gap: 24,
        },
        sectionHeader: {
          gap: 6,
        },
        sectionTitle: {
          fontSize: 20,
          fontWeight: '700',
        },
        sectionSubtitle: {
          color: theme.colors.onSurfaceVariant,
        },
        formCard: {
          borderRadius: 24,
          padding: 20,
          gap: 20,
        },
        fieldGroup: {
          gap: 16,
        },
        dropdownWrapper: {
          borderRadius: 8,
        },
        inlineRow: {
          flexDirection: 'row',
          gap: 12,
          flexWrap: 'wrap',
        },
        inlineField: {
          flex: 1,
        },
        chipsContainer: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        buttonRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 12,
        },
        keyboardAvoider: {
          flex: 1,
        },
        lyricsInput: {
          minHeight: 220,
        },
        modalContainer: {
          marginHorizontal: 24,
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          padding: 20,
          gap: 16,
        },
        modalHeader: {
          gap: 8,
        },
        modalTitle: {
          fontSize: 18,
          fontWeight: '700',
        },
        modalList: {
          maxHeight: 320,
        },
        modalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 4,
        },
        modalLabel: {
          marginLeft: 12,
          flex: 1,
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 12,
        },
      }),
    [theme.colors.background, theme.colors.surface, theme.colors.onSurfaceVariant]
  );

  const toggleSelection = useCallback(
    (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    },
    []
  );

  const summarizeSelection = useCallback((values: string[], labelMap: Map<string, string>) => {
    if (values.length === 0) return '';
    const names = values.map((value) => labelMap.get(value)).filter(Boolean) as string[];
    if (names.length > 2) {
      return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
    }
    return names.join(', ');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add a new track</Text>
            <Text style={styles.sectionSubtitle}>
              Capture the essential details for your custom song. Playlist, title, key, level, language, contributing
              artists, writers, and lyrics are required.
            </Text>
          </View>

          <Surface elevation={1} style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Menu
              visible={playlistMenuVisible}
              onDismiss={() => setPlaylistMenuVisible(false)}
              anchor={
                <TouchableRipple style={styles.dropdownWrapper} onPress={() => setPlaylistMenuVisible(true)} borderless>
                  <View pointerEvents="none">
                    <TextInput
                      label="Playlist"
                      mode="outlined"
                      value={playlistLabelMap.get(playlist) ?? ''}
                      placeholder="Select a playlist"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
              }
            >
              {playlistOptions.map((option) => (
                <Menu.Item
                  key={option.value}
                  title={option.label}
                  onPress={() => {
                    setPlaylist(option.value);
                    setPlaylistMenuVisible(false);
                  }}
                />
              ))}
            </Menu>

            <TextInput
              label="Title"
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              placeholder="Song title"
            />

            <View style={styles.inlineRow}>
              <TextInput
                label="Key"
                mode="outlined"
                value={key}
                onChangeText={setKey}
                placeholder="e.g. C"
                style={styles.inlineField}
                right={<TextInput.Icon icon="piano" />}
              />
              <Menu
                visible={levelMenuVisible}
                onDismiss={() => setLevelMenuVisible(false)}
                anchor={
                  <TouchableRipple
                    style={[styles.dropdownWrapper, styles.inlineField]}
                    onPress={() => setLevelMenuVisible(true)}
                    borderless
                  >
                    <View pointerEvents="none">
                      <TextInput
                        label="Level"
                        mode="outlined"
                        value={levelLabelMap.get(level) ?? ''}
                        placeholder="Select level"
                        editable={false}
                        right={<TextInput.Icon icon="menu-down" />}
                      />
                    </View>
                  </TouchableRipple>
                }
              >
                {levelOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    title={option.label}
                    onPress={() => {
                      setLevel(option.value);
                      setLevelMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>
            </View>

            <Menu
              visible={languageMenuVisible}
              onDismiss={() => setLanguageMenuVisible(false)}
              anchor={
                <TouchableRipple style={styles.dropdownWrapper} onPress={() => setLanguageMenuVisible(true)} borderless>
                  <View pointerEvents="none">
                    <TextInput
                      label="Language"
                      mode="outlined"
                      value={languageLabelMap.get(language) ?? ''}
                      placeholder="Select language"
                      editable={false}
                      right={<TextInput.Icon icon="translate" />}
                    />
                  </View>
                </TouchableRipple>
              }
            >
              {languageOptions.map((option) => (
                <Menu.Item
                  key={option.value}
                  title={option.label}
                  onPress={() => {
                    setLanguage(option.value);
                    setLanguageMenuVisible(false);
                  }}
                />
              ))}
            </Menu>

            <TextInput
              label="Release year"
              mode="outlined"
              value={releaseYear}
              onChangeText={setReleaseYear}
              placeholder="2024"
              keyboardType="numeric"
            />
            </View>
          </Surface>

          <Surface elevation={1} style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <View>
                <TouchableRipple style={styles.dropdownWrapper} onPress={() => setAlbumModalVisible(true)} borderless>
                  <View pointerEvents="none">
                    <TextInput
                      label="Albums"
                      mode="outlined"
                      value={summarizeSelection(selectedAlbums, albumLabelMap)}
                      placeholder="Select albums"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
                <HelperText type="info">Select one or many albums that feature this track.</HelperText>
                <View style={styles.chipsContainer}>
                  {selectedAlbums.map((value) => {
                    const label = albumLabelMap.get(value);
                    if (!label) return null;
                    return (
                      <Chip
                        key={value}
                        mode="outlined"
                        onClose={() => setSelectedAlbums((prev) => prev.filter((item) => item !== value))}
                      >
                        {label}
                      </Chip>
                    );
                  })}
                </View>
              </View>

              <View>
                <TouchableRipple style={styles.dropdownWrapper} onPress={() => setArtistModalVisible(true)} borderless>
                  <View pointerEvents="none">
                    <TextInput
                      label="Artists"
                      mode="outlined"
                      value={summarizeSelection(selectedArtists, artistLabelMap)}
                      placeholder="Select artists"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
                <HelperText type="info">Add the performers credited on this recording.</HelperText>
                <View style={styles.chipsContainer}>
                  {selectedArtists.map((value) => {
                    const label = artistLabelMap.get(value);
                    if (!label) return null;
                    return (
                      <Chip
                        key={value}
                        mode="outlined"
                        onClose={() => setSelectedArtists((prev) => prev.filter((item) => item !== value))}
                      >
                        {label}
                      </Chip>
                    );
                  })}
                </View>
              </View>

              <View>
                <TouchableRipple style={styles.dropdownWrapper} onPress={() => setWriterModalVisible(true)} borderless>
                  <View pointerEvents="none">
                    <TextInput
                      label="Writers"
                      mode="outlined"
                      value={summarizeSelection(selectedWriters, writerLabelMap)}
                      placeholder="Select writers"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
                <HelperText type="info">Credit the lyricists and composers for this track.</HelperText>
                <View style={styles.chipsContainer}>
                  {selectedWriters.map((value) => {
                    const label = writerLabelMap.get(value);
                    if (!label) return null;
                    return (
                      <Chip
                        key={value}
                        mode="outlined"
                        onClose={() => setSelectedWriters((prev) => prev.filter((item) => item !== value))}
                      >
                        {label}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            </View>
          </Surface>

          <Surface elevation={1} style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <TextInput
                label="Lyrics"
                mode="outlined"
                value={lyric}
                onChangeText={setLyric}
                placeholder="Start typing the chord & lyric sheet..."
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                style={styles.lyricsInput}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button mode="outlined">Discard</Button>
              <Button mode="contained">Save draft</Button>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Modal visible={albumModalVisible} onDismiss={() => setAlbumModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select albums</Text>
            <Searchbar
              placeholder="Search albums"
              value={albumQuery}
              onChangeText={setAlbumQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <ScrollView style={styles.modalList}>
            {filteredAlbumOptions.map((option) => {
              const checked = selectedAlbums.includes(option.value);
              return (
                <TouchableRipple
                  key={option.value}
                  onPress={() => toggleSelection(option.value, setSelectedAlbums)}
                  borderless
                >
                  <View style={styles.modalRow}>
                    <Checkbox status={checked ? 'checked' : 'unchecked'} />
                    <Text style={styles.modalLabel}>{option.label}</Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </ScrollView>
          <View style={styles.modalActions}>
            <Button onPress={() => setSelectedAlbums([])}>Clear</Button>
            <Button mode="contained" onPress={() => setAlbumModalVisible(false)}>
              Done
            </Button>
          </View>
        </Modal>

        <Modal visible={artistModalVisible} onDismiss={() => setArtistModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select artists</Text>
            <Searchbar
              placeholder="Search artists"
              value={artistQuery}
              onChangeText={setArtistQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <ScrollView style={styles.modalList}>
            {filteredArtistOptions.map((option) => {
              const checked = selectedArtists.includes(option.value);
              return (
                <TouchableRipple
                  key={option.value}
                  onPress={() => toggleSelection(option.value, setSelectedArtists)}
                  borderless
                >
                  <View style={styles.modalRow}>
                    <Checkbox status={checked ? 'checked' : 'unchecked'} />
                    <Text style={styles.modalLabel}>{option.label}</Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </ScrollView>
          <View style={styles.modalActions}>
            <Button onPress={() => setSelectedArtists([])}>Clear</Button>
            <Button mode="contained" onPress={() => setArtistModalVisible(false)}>
              Done
            </Button>
          </View>
        </Modal>

        <Modal visible={writerModalVisible} onDismiss={() => setWriterModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select writers</Text>
            <Searchbar
              placeholder="Search writers"
              value={writerQuery}
              onChangeText={setWriterQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <ScrollView style={styles.modalList}>
            {filteredWriterOptions.map((option) => {
              const checked = selectedWriters.includes(option.value);
              return (
                <TouchableRipple
                  key={option.value}
                  onPress={() => toggleSelection(option.value, setSelectedWriters)}
                  borderless
                >
                  <View style={styles.modalRow}>
                    <Checkbox status={checked ? 'checked' : 'unchecked'} />
                    <Text style={styles.modalLabel}>{option.label}</Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </ScrollView>
          <View style={styles.modalActions}>
            <Button onPress={() => setSelectedWriters([])}>Clear</Button>
            <Button mode="contained" onPress={() => setWriterModalVisible(false)}>
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}
