import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Theme } from 'react-native-paper';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Chip,
  HelperText,
  Modal,
  Portal,
  Searchbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { useEntitySearch } from '@/hooks/useEntitySearch';
import { ApiError } from '@/lib/api';

import type { NamedOption } from './types';
import type { SearchableEntity } from '@/hooks/useEntitySearch';

type EntityMultiSelectProps = {
  endpoint: string;
  label: string;
  modalTitle: string;
  searchPlaceholder: string;
  helperText?: string;
  emptyMessage: string;
  loadingMessage: string;
  fieldKey: string;
  value: NamedOption[];
  setValue: React.Dispatch<React.SetStateAction<NamedOption[]>>;
  errorMessage?: string | null;
  clearFieldError: (field: string) => void;
  onClearFormFeedback: () => void;
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

export function EntityMultiSelect({
  endpoint,
  label,
  modalTitle,
  searchPlaceholder,
  helperText,
  emptyMessage,
  loadingMessage,
  fieldKey,
  value,
  setValue,
  errorMessage,
  clearFieldError,
  onClearFormFeedback,
}: EntityMultiSelectProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchState = useEntitySearch<SearchableEntity>(endpoint, searchQuery, visible);

  const options = useMemo<NamedOption[]>(() => {
    const raw = searchState.data?.data ?? [];
    return raw
      .map(toNamedOption)
      .filter((option) => Number.isFinite(option.id))
      .filter((option) => option.name.trim().length > 0);
  }, [searchState.data]);

  const closeModal = useCallback(() => {
    setVisible(false);
    setSearchQuery('');
  }, []);

  const toggleSelection = useCallback(
    (option: NamedOption) => {
      onClearFormFeedback();
      setValue((prev) => {
        const exists = prev.some((item) => item.id === option.id);
        const next = exists ? prev.filter((item) => item.id !== option.id) : [...prev, option];
        clearFieldError(fieldKey);
        return next;
      });
    },
    [clearFieldError, fieldKey, onClearFormFeedback, setValue]
  );

  const removeSelection = useCallback(
    (id: number) => {
      onClearFormFeedback();
      setValue((prev) => {
        const next = prev.filter((item) => item.id !== id);
        clearFieldError(fieldKey);
        return next;
      });
    },
    [clearFieldError, fieldKey, onClearFormFeedback, setValue]
  );

  const handleClear = useCallback(() => {
    onClearFormFeedback();
    setValue([]);
    clearFieldError(fieldKey);
  }, [clearFieldError, fieldKey, onClearFormFeedback, setValue]);

  const renderOptions = useCallback(() => {
    if (searchState.isError) {
      const message =
        searchState.error instanceof ApiError
          ? searchState.error.message
          : 'Unable to load items. Please try again.';
      return (
        <View style={styles.modalFeedback}>
          <Text style={styles.modalFeedbackText}>{message}</Text>
          <Button mode="outlined" onPress={searchState.refetch}>
            Retry
          </Button>
        </View>
      );
    }

    if (searchState.isFetching && options.length === 0) {
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
          const checked = value.some((item) => item.id === option.id);
          return (
            <TouchableRipple key={option.id} onPress={() => toggleSelection(option)} borderless>
              <View style={styles.modalRow}>
                <Checkbox status={checked ? 'checked' : 'unchecked'} />
                <Text style={styles.modalLabel}>{option.name}</Text>
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>
    );
  }, [emptyMessage, loadingMessage, options, searchState, styles, toggleSelection, value]);

  return (
    <View style={styles.wrapper}>
      <TouchableRipple style={styles.dropdownWrapper} onPress={() => setVisible(true)} borderless>
        <View pointerEvents="none">
          <TextInput
            label={label}
            mode="outlined"
            value={summarizeSelection(value)}
            placeholder={`Select ${label.toLowerCase()}`}
            editable={false}
            right={<TextInput.Icon icon="menu-down" />}
          />
        </View>
      </TouchableRipple>
      {helperText ? <HelperText type="info">{helperText}</HelperText> : null}
      <View style={styles.chipsContainer}>
        {value.map((item) => (
          <Chip key={item.id} mode="outlined" onClose={() => removeSelection(item.id)}>
            {item.name}
          </Chip>
        ))}
      </View>
      {errorMessage ? (
        <HelperText type="error" visible>
          {errorMessage}
        </HelperText>
      ) : null}

      <Portal>
        <Modal visible={visible} onDismiss={closeModal} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Searchbar
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              loading={searchState.isFetching}
            />
          </View>

          {renderOptions()}

          <View style={styles.modalActions}>
            <Button onPress={handleClear} disabled={searchState.isFetching}>
              Clear
            </Button>
            <Button mode="contained" onPress={closeModal}>
              Done
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      gap: 8,
    },
    dropdownWrapper: {
      borderRadius: 8,
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
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
  });
