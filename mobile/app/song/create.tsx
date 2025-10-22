import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
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

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLevels } from '@/hooks/useLevels';
import { useLanguages } from '@/hooks/useLanguages';
import { useEntitySearch, type SearchableEntity } from '@/hooks/useEntitySearch';
import { useCreateSongMutation } from '@/hooks/useCreateSong';
import { ApiError } from '@/lib/api';

type NamedOption = {
  id: number;
  name: string;
};

type EntitySearchMeta = {
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => unknown;
};

function toNamedOption(entity: SearchableEntity): NamedOption {
  const name =
    typeof entity.name === 'string' && entity.name.trim().length > 0
      ? entity.name.trim()
      : `Item #${entity.id}`;
  return {
    id: Number(entity.id),
    name,
  };
}

function summarizeSelection(values: NamedOption[]): string {
  if (values.length === 0) return '';
  const names = values.map((value) => value.name).filter(Boolean);
  if (names.length <= 2) {
    return names.join(', ');
  }
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export default function SongCreateScreen() {
  const theme = useTheme();
  const { isAuthenticated, isChecking } = useRequireAuth();

  const queriesEnabled = isAuthenticated && !isChecking;
  const levelsQuery = useLevels(queriesEnabled);
  const languagesQuery = useLanguages(queriesEnabled);

  const [title, setTitle] = useState('');
  const [key, setKey] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [lyric, setLyric] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedLevel, setSelectedLevel] = useState<NamedOption | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<NamedOption | null>(null);

  const [levelMenuVisible, setLevelMenuVisible] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

  const [selectedAlbums, setSelectedAlbums] = useState<NamedOption[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<NamedOption[]>([]);
  const [selectedWriters, setSelectedWriters] = useState<NamedOption[]>([]);

  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [artistModalVisible, setArtistModalVisible] = useState(false);
  const [writerModalVisible, setWriterModalVisible] = useState(false);

  const [albumQuery, setAlbumQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [writerQuery, setWriterQuery] = useState('');

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const toggleSelection = useCallback(
    (option: NamedOption, setter: React.Dispatch<React.SetStateAction<NamedOption[]>>, fieldKey: string) => {
      setSubmitError(null);
      setter((prev) => {
        const exists = prev.some((item) => item.id === option.id);
        const next = exists ? prev.filter((item) => item.id !== option.id) : [...prev, option];
        clearFieldError(fieldKey);
        return next;
      });
    },
    [clearFieldError, setSubmitError]
  );

  const albumSearchQuery = useEntitySearch<SearchableEntity>('/api/albums', albumQuery, albumModalVisible);
  const artistSearchQuery = useEntitySearch<SearchableEntity>('/api/artists', artistQuery, artistModalVisible);
  const writerSearchQuery = useEntitySearch<SearchableEntity>('/api/writers', writerQuery, writerModalVisible);

  const albumOptions = useMemo<NamedOption[]>(
    () =>
      (albumSearchQuery.data?.data ?? [])
        .map(toNamedOption)
        .filter((option) => Number.isFinite(option.id)),
    [albumSearchQuery.data]
  );
  const artistOptions = useMemo<NamedOption[]>(
    () =>
      (artistSearchQuery.data?.data ?? [])
        .map(toNamedOption)
        .filter((option) => Number.isFinite(option.id)),
    [artistSearchQuery.data]
  );
  const writerOptions = useMemo<NamedOption[]>(
    () =>
      (writerSearchQuery.data?.data ?? [])
        .map(toNamedOption)
        .filter((option) => Number.isFinite(option.id)),
    [writerSearchQuery.data]
  );

  const levelOptions = useMemo<NamedOption[]>(
    () =>
      (levelsQuery.data?.data ?? [])
        .map((level) => ({
          id: Number(level.id),
          name:
            typeof level.name === 'string' && level.name.trim().length > 0
              ? level.name.trim()
              : `Level #${level.id}`,
        }))
        .filter((option) => Number.isFinite(option.id)),
    [levelsQuery.data]
  );

  const languageOptions = useMemo<NamedOption[]>(
    () =>
      (languagesQuery.data?.data ?? [])
        .map((language) => ({
          id: Number(language.id),
          name:
            typeof language.name === 'string' && language.name.trim().length > 0
              ? language.name.trim()
              : `Language #${language.id}`,
        }))
        .filter((option) => Number.isFinite(option.id)),
    [languagesQuery.data]
  );

  useEffect(() => {
    if (!selectedLevel && levelOptions.length > 0) {
      setSelectedLevel(levelOptions[0]);
      clearFieldError('level_id');
    }
  }, [clearFieldError, levelOptions, selectedLevel]);

  useEffect(() => {
    if (!selectedLanguage && languageOptions.length > 0) {
      setSelectedLanguage(languageOptions[0]);
      clearFieldError('language');
    }
  }, [clearFieldError, languageOptions, selectedLanguage]);

  const createSongMutation = useCreateSongMutation();
  const isSubmitting = createSongMutation.isPending;

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
        modalFeedback: {
          alignItems: 'center',
          gap: 12,
          paddingVertical: 32,
        },
        modalFeedbackText: {
          textAlign: 'center',
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.background, theme.colors.onSurfaceVariant, theme.colors.surface]
  );

  const resetQueries = useCallback(() => {
    setAlbumQuery('');
    setArtistQuery('');
    setWriterQuery('');
  }, []);

  const clearFormFields = useCallback(() => {
    setTitle('');
    setKey('');
    setReleaseYear('');
    setLyric('');
    setSelectedAlbums([]);
    setSelectedArtists([]);
    setSelectedWriters([]);
    setSelectedLevel(null);
    setSelectedLanguage(null);
    setAlbumModalVisible(false);
    setArtistModalVisible(false);
    setWriterModalVisible(false);
    resetQueries();
  }, [resetQueries]);

  const resetForm = useCallback(() => {
    clearFormFields();
    setSubmitError(null);
    setSubmitSuccess(null);
    setFieldErrors({});
  }, [clearFormFields]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSubmitError('Title is required.');
      setFieldErrors((prev) => ({ ...prev, title: 'Title is required.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('title');

    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setSubmitError('Key is required.');
      setFieldErrors((prev) => ({ ...prev, key: 'Key is required.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('key');

    if (!selectedLevel) {
      setSubmitError('Select a difficulty level.');
      setFieldErrors((prev) => ({ ...prev, level_id: 'Difficulty level is required.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('level_id');

    if (!selectedLanguage) {
      setSubmitError('Select a language.');
      setFieldErrors((prev) => ({ ...prev, language: 'Language is required.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('language');

    if (selectedArtists.length === 0) {
      setSubmitError('Add at least one artist.');
      setFieldErrors((prev) => ({ ...prev, artist_ids: 'Select at least one artist.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('artist_ids');

    if (selectedWriters.length === 0) {
      setSubmitError('Add at least one writer.');
      setFieldErrors((prev) => ({ ...prev, writer_ids: 'Select at least one writer.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('writer_ids');

    const trimmedLyric = lyric.trim();
    if (!trimmedLyric) {
      setSubmitError('Lyrics are required.');
      setFieldErrors((prev) => ({ ...prev, lyric: 'Lyrics are required.' }));
      setSubmitSuccess(null);
      return;
    }
    clearFieldError('lyric');

    let releaseYearNumber: number | undefined;
    const trimmedYear = releaseYear.trim();
    if (trimmedYear) {
      const parsed = Number(trimmedYear);
      if (!Number.isFinite(parsed)) {
        setSubmitError('Release year must be a number.');
        setFieldErrors((prev) => ({ ...prev, release_year: 'Release year must be a number.' }));
        setSubmitSuccess(null);
        return;
      }
      releaseYearNumber = parsed;
      clearFieldError('release_year');
    }

    const albumIds = selectedAlbums.map((album) => album.id);
    const artistIds = selectedArtists.map((artist) => artist.id);
    const writerIds = selectedWriters.map((writer) => writer.id);

    const payload = {
      title: trimmedTitle,
      level_id: selectedLevel.id,
      key: trimmedKey,
      language_id: selectedLanguage.id,
      lyric: trimmedLyric,
      ...(releaseYearNumber !== undefined ? { release_year: releaseYearNumber } : {}),
      ...(albumIds.length > 0 ? { album_ids: albumIds } : {}),
      artist_ids: artistIds,
      writer_ids: writerIds,
    };

    setSubmitError(null);
    setSubmitSuccess(null);
    setFieldErrors({});
    try {
      const response = await createSongMutation.mutateAsync(payload);
      clearFormFields();
      setSubmitSuccess(
        response?.message ?? 'Song submitted successfully. We will review it shortly.'
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const rawErrors = error.errors;
        let normalized: Record<string, string> = {};
        if (rawErrors && typeof rawErrors === 'object') {
          normalized = Object.entries(rawErrors as Record<string, unknown>).reduce<Record<string, string>>(
            (acc, [key, value]) => {
              if (typeof value === 'string' && value.trim().length > 0) {
                acc[key] = value;
              } else if (Array.isArray(value)) {
                const firstString = value.find(
                  (item) => typeof item === 'string' && item.trim().length > 0
                );
                if (typeof firstString === 'string') {
                  acc[key] = firstString;
                }
              }
              return acc;
            },
            {}
          );
        }
        setFieldErrors(normalized);
        const message =
          rawErrors && typeof rawErrors === 'object' && typeof (rawErrors as Record<string, unknown>).message === 'string'
            ? ((rawErrors as Record<string, unknown>).message as string)
            : error.message;
        setSubmitError(message || 'Unable to create the song right now. Please try again.');
      } else {
        setSubmitError('Unable to create the song right now. Please try again.');
      }
      setSubmitSuccess(null);
    }
  }, [
    clearFormFields,
    createSongMutation,
    isSubmitting,
    key,
    lyric,
    releaseYear,
    selectedAlbums,
    selectedArtists,
    selectedLanguage,
    selectedLevel,
    selectedWriters,
    title,
  ]);

  if (isChecking || !isAuthenticated) {
    return null;
  }

  const levelErrorMessage =
    levelsQuery.isError && levelsQuery.error instanceof ApiError
      ? levelsQuery.error.message
      : levelsQuery.isError
      ? 'Unable to load levels.'
      : null;

  const languageErrorMessage =
    languagesQuery.isError && languagesQuery.error instanceof ApiError
      ? languagesQuery.error.message
      : languagesQuery.isError
      ? 'Unable to load languages.'
      : null;

  const renderOptionsList = (
    options: NamedOption[],
    selected: NamedOption[],
    setSelected: React.Dispatch<React.SetStateAction<NamedOption[]>>,
    queryState: EntitySearchMeta,
    loadingMessage: string,
    emptyMessage: string,
    fieldKey: string
  ) => {
    if (queryState.isError) {
      const message =
        queryState.error instanceof ApiError ? queryState.error.message : emptyMessage;
      return (
        <View style={styles.modalFeedback}>
          <Text style={styles.modalFeedbackText}>{message}</Text>
          <Button mode="outlined" onPress={queryState.refetch}>
            Retry
          </Button>
        </View>
      );
    }

    if (queryState.isFetching && options.length === 0) {
      return (
        <View style={styles.modalFeedback}>
          <ActivityIndicator animating />
          <Text style={styles.modalFeedbackText}>{loadingMessage}</Text>
        </View>
      );
    }

    if (options.length === 0) {
      return (
        <View style={styles.modalFeedback}>
          <Text style={styles.modalFeedbackText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.modalList}>
        {options.map((option) => {
          const checked = selected.some((item) => item.id === option.id);
          return (
            <TouchableRipple
              key={option.id}
              onPress={() => toggleSelection(option, setSelected, fieldKey)}
              borderless
            >
              <View style={styles.modalRow}>
                <Checkbox status={checked ? 'checked' : 'unchecked'} />
                <Text style={styles.modalLabel}>{option.name}</Text>
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>
    );
  };

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
              Capture the essential details for your custom song. Title, key, level, language,
              contributing artists, writers, and lyrics are required.
            </Text>
          </View>

          <Surface elevation={1} style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <TextInput
                label="Title"
                mode="outlined"
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  if (submitError) setSubmitError(null);
                  clearFieldError('title');
                }}
                placeholder="Song title"
              />
              {fieldErrors.title ? (
                <HelperText type="error" visible>
                  {fieldErrors.title}
                </HelperText>
              ) : null}

              <View style={styles.inlineRow}>
                <TextInput
                  label="Key"
                  mode="outlined"
                  value={key}
                  onChangeText={(value) => {
                    setKey(value);
                    if (submitError) setSubmitError(null);
                    clearFieldError('key');
                  }}
                  placeholder="e.g. C"
                  style={styles.inlineField}
                  right={<TextInput.Icon icon="piano" />}
                />
                {fieldErrors.key ? (
                  <HelperText type="error" visible>
                    {fieldErrors.key}
                  </HelperText>
                ) : null}
                <Menu
                  visible={levelMenuVisible}
                  onDismiss={() => setLevelMenuVisible(false)}
                  anchor={
                    <TouchableRipple
                      style={[styles.dropdownWrapper, styles.inlineField]}
                      onPress={() => setLevelMenuVisible(true)}
                      borderless
                      disabled={levelOptions.length === 0}
                    >
                      <View pointerEvents="none">
                        <TextInput
                          label="Level"
                          mode="outlined"
                          value={selectedLevel?.name ?? ''}
                          placeholder={
                            levelOptions.length === 0 ? 'Loading levels…' : 'Select level'
                          }
                          editable={false}
                          right={<TextInput.Icon icon="menu-down" />}
                        />
                      </View>
                    </TouchableRipple>
                  }
                >
                  {levelOptions.map((option) => (
                    <Menu.Item
                      key={option.id}
                      title={option.name}
                      onPress={() => {
                        setSelectedLevel(option);
                        setLevelMenuVisible(false);
                        clearFieldError('level_id');
                      }}
                    />
                  ))}
                </Menu>
              </View>
              {levelErrorMessage ? (
                <HelperText type="error">{levelErrorMessage}</HelperText>
              ) : null}

              <Menu
                visible={languageMenuVisible}
                onDismiss={() => setLanguageMenuVisible(false)}
                anchor={
                  <TouchableRipple
                    style={styles.dropdownWrapper}
                    onPress={() => setLanguageMenuVisible(true)}
                    borderless
                    disabled={languageOptions.length === 0}
                  >
                    <View pointerEvents="none">
                      <TextInput
                        label="Language"
                        mode="outlined"
                        value={selectedLanguage?.name ?? ''}
                        placeholder={
                          languageOptions.length === 0 ? 'Loading languages…' : 'Select language'
                        }
                        editable={false}
                        right={<TextInput.Icon icon="translate" />}
                      />
                    </View>
                  </TouchableRipple>
                }
              >
                {languageOptions.map((option) => (
                    <Menu.Item
                      key={option.id}
                      title={option.name}
                      onPress={() => {
                        setSelectedLanguage(option);
                        setLanguageMenuVisible(false);
                        clearFieldError('language');
                      }}
                    />
                  ))}
              </Menu>
              {languageErrorMessage ? (
                <HelperText type="error">{languageErrorMessage}</HelperText>
              ) : fieldErrors.language ? (
                <HelperText type="error" visible>
                  {fieldErrors.language}
                </HelperText>
              ) : null}

              <TextInput
                label="Release year"
                mode="outlined"
                value={releaseYear}
                onChangeText={(value) => {
                  setReleaseYear(value);
                  if (submitError) setSubmitError(null);
                  clearFieldError('release_year');
                }}
                placeholder="e.g. 1998"
                keyboardType="numeric"
              />
              {fieldErrors.release_year ? (
                <HelperText type="error" visible>
                  {fieldErrors.release_year}
                </HelperText>
              ) : null}
            </View>
          </Surface>

          <Surface elevation={1} style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <View>
                <TouchableRipple
                  style={styles.dropdownWrapper}
                  onPress={() => setAlbumModalVisible(true)}
                  borderless
                >
                  <View pointerEvents="none">
                    <TextInput
                      label="Albums"
                      mode="outlined"
                      value={summarizeSelection(selectedAlbums)}
                      placeholder="Select albums"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
                <HelperText type="info">
                  Select one or many albums that feature this track.
                </HelperText>
                <View style={styles.chipsContainer}>
                  {selectedAlbums.map((album) => (
                    <Chip
                      key={album.id}
                      mode="outlined"
                      onClose={() =>
                        setSelectedAlbums((prev) => {
                          setSubmitError(null);
                          const next = prev.filter((item) => item.id !== album.id);
                          clearFieldError('album_ids');
                          return next;
                        })
                      }
                    >
                      {album.name}
                    </Chip>
                  ))}
                </View>
                {fieldErrors.album_ids ? (
                  <HelperText type="error" visible>
                    {fieldErrors.album_ids}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TouchableRipple
                  style={styles.dropdownWrapper}
                  onPress={() => setArtistModalVisible(true)}
                  borderless
                >
                  <View pointerEvents="none">
                    <TextInput
                      label="Artists"
                      mode="outlined"
                      value={summarizeSelection(selectedArtists)}
                      placeholder="Select artists"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
                <HelperText type="info">
                  Add the performers credited on this recording.
                </HelperText>
                <View style={styles.chipsContainer}>
                  {selectedArtists.map((artist) => (
                    <Chip
                      key={artist.id}
                      mode="outlined"
                      onClose={() =>
                        setSelectedArtists((prev) => {
                          setSubmitError(null);
                          const next = prev.filter((item) => item.id !== artist.id);
                          clearFieldError('artist_ids');
                          return next;
                        })
                      }
                    >
                      {artist.name}
                    </Chip>
                  ))}
                </View>
                {fieldErrors.artist_ids ? (
                  <HelperText type="error" visible>
                    {fieldErrors.artist_ids}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TouchableRipple
                  style={styles.dropdownWrapper}
                  onPress={() => setWriterModalVisible(true)}
                  borderless
                >
                  <View pointerEvents="none">
                    <TextInput
                      label="Writers"
                      mode="outlined"
                      value={summarizeSelection(selectedWriters)}
                      placeholder="Select writers"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </TouchableRipple>
                <HelperText type="info">
                  Credit the lyricists and composers for this track.
                </HelperText>
                <View style={styles.chipsContainer}>
                  {selectedWriters.map((writer) => (
                    <Chip
                      key={writer.id}
                      mode="outlined"
                      onClose={() =>
                        setSelectedWriters((prev) => {
                          setSubmitError(null);
                          const next = prev.filter((item) => item.id !== writer.id);
                          clearFieldError('writer_ids');
                          return next;
                        })
                      }
                    >
                      {writer.name}
                    </Chip>
                  ))}
                </View>
                {fieldErrors.writer_ids ? (
                  <HelperText type="error" visible>
                    {fieldErrors.writer_ids}
                  </HelperText>
                ) : null}
              </View>
            </View>
          </Surface>

          <Surface elevation={1} style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <TextInput
                label="Lyrics"
                mode="outlined"
                value={lyric}
                onChangeText={(value) => {
                  setLyric(value);
                  if (submitError) setSubmitError(null);
                  clearFieldError('lyric');
                }}
                placeholder="Start typing the chord & lyric sheet..."
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                style={styles.lyricsInput}
              />
              {fieldErrors.lyric ? (
                <HelperText type="error" visible>
                  {fieldErrors.lyric}
                </HelperText>
              ) : null}
            </View>

            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={resetForm} disabled={isSubmitting}>
                Discard
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Create song
              </Button>
            </View>
            {submitError ? (
              <HelperText type="error" visible>
                {submitError}
              </HelperText>
            ) : null}
            {submitSuccess ? (
              <HelperText type="info" visible>
                {submitSuccess}
              </HelperText>
            ) : null}
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Modal
          visible={albumModalVisible}
          onDismiss={() => {
            setAlbumModalVisible(false);
            setAlbumQuery('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select albums</Text>
            <Searchbar
              placeholder="Search albums"
              value={albumQuery}
              onChangeText={setAlbumQuery}
              autoCorrect={false}
              autoCapitalize="none"
              loading={albumSearchQuery.isFetching}
            />
          </View>
          {renderOptionsList(
            albumOptions,
            selectedAlbums,
            setSelectedAlbums,
            {
              isError: albumSearchQuery.isError,
              error: albumSearchQuery.error,
              isFetching: albumSearchQuery.isFetching,
              refetch: albumSearchQuery.refetch,
            },
            'Loading albums…',
            'No albums found. Try another search.',
            'album_ids'
          )}
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setSelectedAlbums([]);
                clearFieldError('album_ids');
                setSubmitError(null);
              }}
              disabled={albumSearchQuery.isFetching}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                setAlbumModalVisible(false);
                setAlbumQuery('');
              }}
            >
              Done
            </Button>
          </View>
        </Modal>

        <Modal
          visible={artistModalVisible}
          onDismiss={() => {
            setArtistModalVisible(false);
            setArtistQuery('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select artists</Text>
            <Searchbar
              placeholder="Search artists"
              value={artistQuery}
              onChangeText={setArtistQuery}
              autoCorrect={false}
              autoCapitalize="none"
              loading={artistSearchQuery.isFetching}
            />
          </View>
          {renderOptionsList(
            artistOptions,
            selectedArtists,
            setSelectedArtists,
            {
              isError: artistSearchQuery.isError,
              error: artistSearchQuery.error,
              isFetching: artistSearchQuery.isFetching,
              refetch: artistSearchQuery.refetch,
            },
            'Loading artists…',
            'No artists found. Try another search.',
            'artist_ids'
          )}
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setSelectedArtists([]);
                clearFieldError('artist_ids');
                setSubmitError(null);
              }}
              disabled={artistSearchQuery.isFetching}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                setArtistModalVisible(false);
                setArtistQuery('');
              }}
            >
              Done
            </Button>
          </View>
        </Modal>

        <Modal
          visible={writerModalVisible}
          onDismiss={() => {
            setWriterModalVisible(false);
            setWriterQuery('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select writers</Text>
            <Searchbar
              placeholder="Search writers"
              value={writerQuery}
              onChangeText={setWriterQuery}
              autoCorrect={false}
              autoCapitalize="none"
              loading={writerSearchQuery.isFetching}
            />
          </View>
          {renderOptionsList(
            writerOptions,
            selectedWriters,
            setSelectedWriters,
            {
              isError: writerSearchQuery.isError,
              error: writerSearchQuery.error,
              isFetching: writerSearchQuery.isFetching,
              refetch: writerSearchQuery.refetch,
            },
            'Loading writers…',
            'No writers found. Try another search.',
            'writer_ids'
          )}
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setSelectedWriters([]);
                clearFieldError('writer_ids');
                setSubmitError(null);
              }}
              disabled={writerSearchQuery.isFetching}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                setWriterModalVisible(false);
                setWriterQuery('');
              }}
            >
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}
