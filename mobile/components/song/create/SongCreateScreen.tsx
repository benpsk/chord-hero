import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLevels } from '@/hooks/useLevels';
import { useLanguages } from '@/hooks/useLanguages';
import { useCreateSongMutation } from '@/hooks/useCreateSong';
import { ApiError } from '@/lib/api';
import { ChordProView } from '@/components/ChordProView';
import { toDisplayLines } from '@/lib/chord';

import { EntityMultiSelect } from './EntityMultiSelect';
import { SingleSelectMenu } from './SingleSelectMenu';
import type { NamedOption } from './types';
import type { CreateSongPayload } from '@/hooks/useCreateSong';
import type { SongRecord } from '@/hooks/useSongsSearch';
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

function mapToNamedOptions(
  items: { id: number; name: string | null | undefined }[] | undefined,
  fallbackLabel: string
): NamedOption[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.id === 'number')
    .map((item) => toNamedOption(item.id, item.name, fallbackLabel));
}

const SAMPLE_LYRIC_TEMPLATE = ['@a:', 'intro: [G] [D] [C] [F]', '@l:', '[G]Amazing Grace [D]How'].join('\n');

type SongFormSubmitResult = { message?: string };
type SongFormMode = 'create' | 'edit';

type SongCreateScreenProps = {
  mode?: SongFormMode;
  initialSong?: SongRecord | null;
  onSubmit?: (payload: CreateSongPayload) => Promise<SongFormSubmitResult | void>;
  isSubmittingOverride?: boolean;
  submitLabel?: string;
  resetOnSuccess?: boolean;
};

export function SongCreateScreen({
  mode = 'create',
  initialSong = null,
  onSubmit,
  isSubmittingOverride,
  submitLabel,
  resetOnSuccess,
}: SongCreateScreenProps = {}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isEditMode = mode === 'edit';
  const initialLyric = initialSong?.lyric ?? '';
  const initialLevelOption = initialSong?.level?.id
    ? toNamedOption(initialSong.level.id, initialSong.level.name, 'Level')
    : null;
  const initialLanguageOption = initialSong?.language?.id
    ? toNamedOption(initialSong.language.id, initialSong.language.name, 'Language')
    : null;
  const initialAlbumsOptions = useMemo(
    () => mapToNamedOptions(initialSong?.albums, 'Album'),
    [initialSong?.albums]
  );
  const initialArtistsOptions = useMemo(
    () => mapToNamedOptions(initialSong?.artists, 'Artist'),
    [initialSong?.artists]
  );
  const initialWritersOptions = useMemo(
    () => mapToNamedOptions(initialSong?.writers, 'Writer'),
    [initialSong?.writers]
  );

  const { isAuthenticated, isChecking } = useRequireAuth();
  const queriesEnabled = isAuthenticated && !isChecking;

  const levelsQuery = useLevels(queriesEnabled);
  const languagesQuery = useLanguages(queriesEnabled);

  const [title, setTitle] = useState(initialSong?.title ?? '');
  const [songKey, setSongKey] = useState(initialSong?.key ?? '');
  const [releaseYear, setReleaseYear] = useState(
    initialSong?.release_year != null ? String(initialSong.release_year) : ''
  );
  const [lyric, setLyric] = useState(initialLyric);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewLines, setPreviewLines] = useState<string[]>(() =>
    toDisplayLines(initialLyric || SAMPLE_LYRIC_TEMPLATE)
  );
  const [isPreviewVisible, setPreviewVisible] = useState(false);

  const [selectedLevel, setSelectedLevel] = useState<NamedOption | null>(initialLevelOption);
  const [selectedLanguage, setSelectedLanguage] = useState<NamedOption | null>(initialLanguageOption);

  const [selectedAlbums, setSelectedAlbums] = useState<NamedOption[]>(initialAlbumsOptions);
  const [selectedArtists, setSelectedArtists] = useState<NamedOption[]>(initialArtistsOptions);
  const [selectedWriters, setSelectedWriters] = useState<NamedOption[]>(initialWritersOptions);

  const hasAppliedInitialSong = useRef(false);

  const clearFormFeedback = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setSnackbarMessage(null);
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

  const applySongToState = useCallback(
    (song: SongRecord | null | undefined) => {
      if (!song) {
        setTitle('');
        setSongKey('');
        setReleaseYear('');
        setLyric('');
        setSelectedAlbums([]);
        setSelectedArtists([]);
        setSelectedWriters([]);
        setSelectedLevel(null);
        setSelectedLanguage(null);
        setPreviewLines(toDisplayLines(SAMPLE_LYRIC_TEMPLATE));
        setPreviewVisible(false);
        return;
      }

      setTitle(song.title ?? '');
      setSongKey(song.key ?? '');
      setReleaseYear(
        song.release_year != null ? String(song.release_year) : ''
      );
      const lyricValue = song.lyric ?? '';
      setLyric(lyricValue);
      setSelectedAlbums(mapToNamedOptions(song.albums, 'Album'));
      setSelectedArtists(mapToNamedOptions(song.artists, 'Artist'));
      setSelectedWriters(mapToNamedOptions(song.writers, 'Writer'));
      setSelectedLevel(
        song.level?.id ? toNamedOption(song.level.id, song.level.name, 'Level') : null
      );
      setSelectedLanguage(
        song.language?.id ? toNamedOption(song.language.id, song.language.name, 'Language') : null
      );
      setPreviewLines(toDisplayLines(lyricValue || SAMPLE_LYRIC_TEMPLATE));
      setPreviewVisible(false);
    },
    []
  );

  useEffect(() => {
    if (!initialSong || hasAppliedInitialSong.current) {
      return;
    }
    applySongToState(initialSong);
    hasAppliedInitialSong.current = true;
  }, [applySongToState, initialSong]);

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
    } else if (
      selectedLevel && !levelOptions.some((option) => option.id === selectedLevel.id)
    ) {
      setSelectedLevel(levelOptions[0] ?? null);
    }
  }, [clearFieldError, levelOptions, selectedLevel]);

  useEffect(() => {
    if (!selectedLanguage && languageOptions.length > 0) {
      setSelectedLanguage(languageOptions[0]);
      clearFieldError('language');
    } else if (
      selectedLanguage && !languageOptions.some((option) => option.id === selectedLanguage.id)
    ) {
      setSelectedLanguage(languageOptions[0] ?? null);
    }
  }, [clearFieldError, languageOptions, selectedLanguage]);

  const resetFormState = useCallback(() => {
    applySongToState(initialSong);
  }, [applySongToState, initialSong]);

  const resetForm = useCallback(() => {
    resetFormState();
    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [resetFormState]);

  const createSongMutation = useCreateSongMutation();
  const submitHandler = useCallback(
    (payload: CreateSongPayload) =>
      onSubmit ? onSubmit(payload) : createSongMutation.mutateAsync(payload),
    [createSongMutation, onSubmit]
  );
  const isSubmitting = isSubmittingOverride ?? (onSubmit ? false : createSongMutation.isPending);
  const shouldResetOnSuccess = resetOnSuccess ?? !isEditMode;
  const submitButtonLabel = submitLabel ?? (isEditMode ? 'Save changes' : 'Create song');

  const handlePreview = useCallback(() => {
    clearFormFeedback();
    const previewSource = lyric.trim() ? lyric : SAMPLE_LYRIC_TEMPLATE;
    setPreviewLines(toDisplayLines(previewSource));
    setPreviewVisible(true);
  }, [clearFormFeedback, lyric]);

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
      const result = await submitHandler(payload);
      if (shouldResetOnSuccess) {
        resetFormState();
      } else {
        setTitle(trimmedTitle);
        setSongKey(trimmedKey);
        setReleaseYear(releaseYearValue);
        setLyric(trimmedLyric);
        setPreviewLines(toDisplayLines(trimmedLyric || SAMPLE_LYRIC_TEMPLATE));
      }
      const messageFromResult =
        result && typeof result === 'object' && 'message' in result && typeof (result as SongFormSubmitResult).message === 'string'
          ? (result as SongFormSubmitResult).message
          : undefined;
      const fallbackMessage = isEditMode
        ? 'Song updated successfully.'
        : 'Song submitted successfully. We will review it shortly.';
      const successText = messageFromResult && messageFromResult.trim().length > 0 ? messageFromResult : fallbackMessage;
      setSubmitSuccess(successText);
      setSnackbarMessage(successText);
    } catch (error) {
      if (error instanceof ApiError) {
        const normalized = normalizeFieldErrors(error.errors as Record<string, unknown> | undefined);
        setFieldErrors(normalized);
        setSubmitError(error.message);
      } else {
        setSubmitError(
          isEditMode
            ? 'Unable to update the song right now. Please try again.'
            : 'Unable to create the song right now. Please try again.'
        );
      }
    }
  }, [
    clearFormFeedback,
    isEditMode,
    isSubmitting,
    releaseYear,
    resetFormState,
    selectedAlbums,
    selectedArtists,
    selectedLanguage,
    selectedLevel,
    selectedWriters,
    shouldResetOnSuccess,
    songKey,
    submitHandler,
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic details</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Associations</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lyrics</Text>
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
                multiline
                numberOfLines={14}
                textAlignVertical="top"
                style={styles.lyricsInput}
                placeholder={SAMPLE_LYRIC_TEMPLATE}
              />
              {fieldErrors.lyric ? (
                <HelperText type="error" visible>
                  {fieldErrors.lyric}
                </HelperText>
              ) : null}
              <View style={styles.guideContainer}>
                <Text style={styles.guideTitle}>Quick Guide</Text>
                <Text style={styles.guideItem}>- Chord only start with @a:</Text>
                <Text style={styles.guideItem}>- Chord + lyric start with @l:</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.buttonRow}>
              <Button
                mode="contained-tonal"
                compact
                disabled={isSubmitting}
                onPress={resetForm}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Reset
              </Button>
              <Button
                mode="contained-tonal"
                compact
                disabled={isSubmitting}
                onPress={handlePreview}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Preview
              </Button>
              <Button
                mode="contained"
                compact
                loading={isSubmitting}
                disabled={
                  isSubmitting ||
                  !selectedLevel ||
                  !selectedLanguage ||
                  levelsQuery.isLoading ||
                  languagesQuery.isLoading
                }
                onPress={handleSubmit}
                style={[styles.actionButton, styles.actionButtonPrimary]}
                contentStyle={styles.actionButtonContent}
              >
                {submitButtonLabel}
              </Button>
            </View>
            {submitError ? (
              <HelperText type="error" visible>
                {submitError}
              </HelperText>
            ) : null}
          </View>

          {isPreviewVisible ? (
            <View style={[styles.section, styles.previewSection]}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewCaption}>See how your chord sheet will render.</Text>
              </View>
              {previewLines.some((line) => line.trim().length > 0) ? (
                <ChordProView
                  lines={previewLines}
                  chordColor={theme.colors.primary}
                  lyricColor={theme.colors.onSurface}
                  mode="over"
                />
              ) : (
                <Text style={styles.previewEmpty}>Nothing to preview yet.</Text>
              )}
            </View>
          ) : null}
        </ScrollView>

        <Snackbar
          visible={typeof snackbarMessage === 'string' && snackbarMessage.length > 0}
          onDismiss={() => setSnackbarMessage(null)}
          duration={4000}
          action={{
            label: 'Dismiss',
            onPress: () => setSnackbarMessage(null),
            textColor: theme.colors.onPrimary,
          }}
          style={styles.snackbar}
          theme={{
            colors: {
              inverseSurface: theme.colors.primary,
              inverseOnSurface: theme.colors.onPrimary,
            },
          }}
        >
          {snackbarMessage}
        </Snackbar>
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 140,
      gap: 20,
    },
    section: {
      gap: 12,
      paddingBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      color: theme.colors.onSurfaceVariant,
    },
    fieldGroup: {
      gap: 12,
    },
    inlineRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    inlineField: {
      flex: 1,
    },
    lyricsInput: {
      minHeight: 180,
    },
    guideContainer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    guideTitle: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    guideItem: {
      color: theme.colors.onSurfaceVariant,
    },
    previewSection: {
      borderBottomWidth: 0,
      paddingBottom: 0,
      gap: 16,
    },
    previewHeader: {
      gap: 4,
    },
    previewTitle: {
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    previewCaption: {
      color: theme.colors.onSurfaceVariant,
    },
    previewEmpty: {
      color: theme.colors.onSurfaceVariant,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: 6,
      alignItems: 'center',
    },
    actionButton: {
      marginHorizontal: 0,
      borderRadius: 12,
    },
    actionButtonPrimary: {
      shadowColor: 'transparent',
    },
    actionButtonContent: {
      paddingHorizontal: 14,
    },
    snackbar: {
      marginHorizontal: 16,
      backgroundColor: theme.colors.primary,
    },
  });

export default SongCreateScreen;
