import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLevels } from '@/hooks/useLevels';
import { useLanguages } from '@/hooks/useLanguages';
import { useCreateSongMutation } from '@/hooks/useCreateSong';
import { ApiError } from '@/lib/api';

import { EntityMultiSelect } from './EntityMultiSelect';
import { SingleSelectMenu } from './SingleSelectMenu';
import type { NamedOption } from './types';
import type { CreateSongPayload } from '@/hooks/useCreateSong';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

function toNamedOption(id: number, name: string | null | undefined, fallbackLabel: string): NamedOption {
  const displayName =
    typeof name === 'string' && name.trim().length > 0 ? name.trim() : `${fallbackLabel} #${id}`;
  return { id: Number(id), name: displayName };
}

function normalizeFieldErrors(errors?: Record<string, unknown>): Record<string, string> {
  if (!errors || typeof errors !== 'object') return {};
  return Object.entries(errors).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      acc[key] = value;
      return acc;
    }
    if (Array.isArray(value)) {
      const firstString = value.find(
        (item) => typeof item === 'string' && item.trim().length > 0
      ) as string | undefined;
      if (firstString) {
        acc[key] = firstString;
      }
    }
    if (!acc[key] && typeof value === 'object' && value !== null) {
      const nested = normalizeFieldErrors(value as Record<string, unknown>);
      if (nested.message) {
        acc[key] = nested.message;
      }
    }
    return acc;
  }, {});
}

export function SongCreateScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { isAuthenticated, isChecking } = useRequireAuth();
  const queriesEnabled = isAuthenticated && !isChecking;

  const levelsQuery = useLevels(queriesEnabled);
  const languagesQuery = useLanguages(queriesEnabled);

  const [title, setTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [lyric, setLyric] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedLevel, setSelectedLevel] = useState<NamedOption | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<NamedOption | null>(null);

  const [selectedAlbums, setSelectedAlbums] = useState<NamedOption[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<NamedOption[]>([]);
  const [selectedWriters, setSelectedWriters] = useState<NamedOption[]>([]);

  const clearFormFeedback = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const levelOptions = useMemo<NamedOption[]>(() => {
    const result = levelsQuery.data?.data ?? [];
    return result
      .map((level) => toNamedOption(level.id, level.name, 'Level'))
      .filter((option) => Number.isFinite(option.id));
  }, [levelsQuery.data]);

  const languageOptions = useMemo<NamedOption[]>(() => {
    const result = languagesQuery.data?.data ?? [];
    return result
      .map((language) => toNamedOption(language.id, language.name, 'Language'))
      .filter((option) => Number.isFinite(option.id));
  }, [languagesQuery.data]);

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

  const resetFormState = useCallback(() => {
    setTitle('');
    setSongKey('');
    setReleaseYear('');
    setLyric('');
    setSelectedAlbums([]);
    setSelectedArtists([]);
    setSelectedWriters([]);
    setSelectedLevel(null);
    setSelectedLanguage(null);
  }, []);

  const resetForm = useCallback(() => {
    resetFormState();
    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [resetFormState]);

  const createSongMutation = useCreateSongMutation();
  const isSubmitting = createSongMutation.isPending;

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    if (!selectedLevel || !selectedLanguage) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedKey = songKey.trim();
    const trimmedLyric = lyric.trim();

    const payload: CreateSongPayload = {
      title: trimmedTitle,
      level_id: selectedLevel.id,
      key: trimmedKey,
      language_id: selectedLanguage.id,
      lyric: trimmedLyric,
      artist_ids: selectedArtists.map((artist) => artist.id),
      writer_ids: selectedWriters.map((writer) => writer.id),
    };

    const releaseYearValue = releaseYear.trim();
    if (releaseYearValue.length > 0) {
      const parsedYear = Number(releaseYearValue);
      payload.release_year = Number.isFinite(parsedYear) ? parsedYear : releaseYearValue;
    }

    if (selectedAlbums.length > 0) {
      payload.album_ids = selectedAlbums.map((album) => album.id);
    }

    clearFormFeedback();
    setFieldErrors({});

    try {
      const response = await createSongMutation.mutateAsync(payload);
      resetFormState();
      setSubmitSuccess(
        response?.message ?? 'Song submitted successfully. We will review it shortly.'
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const normalized = normalizeFieldErrors(error.errors as Record<string, unknown> | undefined);
        setFieldErrors(normalized);
        setSubmitError(error.message);
      } else {
        setSubmitError('Unable to create the song right now. Please try again.');
      }
    }
  }, [
    clearFormFeedback,
    createSongMutation,
    isSubmitting,
    releaseYear,
    resetFormState,
    selectedAlbums,
    selectedArtists,
    selectedLanguage,
    selectedLevel,
    selectedWriters,
    songKey,
    title,
    lyric,
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
                  clearFormFeedback();
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
                  value={songKey}
                  onChangeText={(value) => {
                    setSongKey(value);
                    clearFormFeedback();
                    clearFieldError('key');
                  }}
                  placeholder="e.g. C"
                  style={styles.inlineField}
                  right={<TextInput.Icon icon="piano" />}
                />
                <SingleSelectMenu
                  label="Level"
                  value={selectedLevel}
                  options={levelOptions}
                  fieldKey="level_id"
                  placeholder="Select level"
                  emptyPlaceholder="Loading levels…"
                  clearFieldError={clearFieldError}
                  onChange={setSelectedLevel}
                  onClearFormFeedback={clearFormFeedback}
                  fieldError={fieldErrors.level_id}
                  supportingError={levelErrorMessage}
                />
              </View>

              <SingleSelectMenu
                label="Language"
                value={selectedLanguage}
                options={languageOptions}
                fieldKey="language"
                placeholder="Select language"
                emptyPlaceholder="Loading languages…"
                icon="translate"
                clearFieldError={clearFieldError}
                onChange={setSelectedLanguage}
                onClearFormFeedback={clearFormFeedback}
                fieldError={fieldErrors.language}
                supportingError={languageErrorMessage}
              />

              <TextInput
                label="Release year"
                mode="outlined"
                value={releaseYear}
                onChangeText={(value) => {
                  setReleaseYear(value);
                  clearFormFeedback();
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
              <EntityMultiSelect
                endpoint="/api/albums"
                label="Albums"
                modalTitle="Select albums"
                searchPlaceholder="Search albums"
                helperText="Select one or many albums that feature this track."
                emptyMessage="No albums found. Try another search."
                loadingMessage="Loading albums…"
                fieldKey="album_ids"
                value={selectedAlbums}
                setValue={setSelectedAlbums}
                errorMessage={fieldErrors.album_ids}
                clearFieldError={clearFieldError}
                onClearFormFeedback={clearFormFeedback}
              />

              <EntityMultiSelect
                endpoint="/api/artists"
                label="Artists"
                modalTitle="Select artists"
                searchPlaceholder="Search artists"
                helperText="Add the performing artists for this track."
                emptyMessage="No artists found. Try another search."
                loadingMessage="Loading artists…"
                fieldKey="artist_ids"
                value={selectedArtists}
                setValue={setSelectedArtists}
                errorMessage={fieldErrors.artist_ids}
                clearFieldError={clearFieldError}
                onClearFormFeedback={clearFormFeedback}
              />

              <EntityMultiSelect
                endpoint="/api/writers"
                label="Writers"
                modalTitle="Select writers"
                searchPlaceholder="Search writers"
                helperText="Identify the songwriters credited for this track."
                emptyMessage="No writers found. Try another search."
                loadingMessage="Loading writers…"
                fieldKey="writer_ids"
                value={selectedWriters}
                setValue={setSelectedWriters}
                errorMessage={fieldErrors.writer_ids}
                clearFieldError={clearFieldError}
                onClearFormFeedback={clearFormFeedback}
              />
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
                  clearFormFeedback();
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
                disabled={
                  isSubmitting || !selectedLevel || !selectedLanguage || levelsQuery.isLoading || languagesQuery.isLoading
                }
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
    </SafeAreaView>
  );
}

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardAvoider: {
      flex: 1,
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
    inlineRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    inlineField: {
      flex: 1,
    },
    lyricsInput: {
      minHeight: 220,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
  });

export default SongCreateScreen;
