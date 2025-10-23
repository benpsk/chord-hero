import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Chip,
  HelperText,
  List,
  Modal,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';

type ShareUser = { id: number | string; email: string };

type Props = {
  visible: boolean;
  playlistName?: string | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  results: ShareUser[];
  selectedUsers: ShareUser[];
  isUserSelected: (id: number | string) => boolean;
  onToggleUser: (user: ShareUser) => void;
  onRemoveUser: (id: number | string) => void;
  errorMessage: string | null;
  submitError: string | null;
  loadingSubmit: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function SharePlaylistModal({
  visible,
  playlistName,
  searchValue,
  onSearchChange,
  isLoading,
  results,
  selectedUsers,
  isUserSelected,
  onToggleUser,
  onRemoveUser,
  errorMessage,
  submitError,
  loadingSubmit,
  onDismiss,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const query = searchValue.trim();

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Share playlist</Text>
        <Text style={styles.modalSubtitle}>
          Invite collaborators by searching for their email. Shared users can access this playlist from their library.
        </Text>
      </View>
      <Searchbar
        placeholder="Search by email"
        value={searchValue}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        loading={isLoading}
      />
      {selectedUsers.length > 0 ? (
        <View style={styles.selectedContainer}>
          {selectedUsers.map((user) => (
            <Chip
              key={String(user.id)}
              icon="account"
              style={styles.selectedChip}
              onClose={() => onRemoveUser(user.id)}
            >
              {user.email}
            </Chip>
          ))}
        </View>
      ) : null}
      {errorMessage ? (
        <HelperText type="error">{errorMessage}</HelperText>
      ) : query.length < 3 ? (
        <HelperText type="info">Enter at least three characters to search by email.</HelperText>
      ) : null}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator animating size="small" />
            <Text style={styles.loadingLabel}>Searching users…</Text>
          </View>
        ) : query.length >= 3 && results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyLabel}>No users found with that email.</Text>
          </View>
        ) : (
          <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled">
            {results.map((user) => (
              <List.Item
                key={String(user.id)}
                title={user.email}
                onPress={() => onToggleUser(user)}
                right={() => (
                  <Checkbox
                    status={isUserSelected(user.id) ? 'checked' : 'unchecked'}
                    onPress={() => onToggleUser(user)}
                  />
                )}
                style={styles.resultItem}
              />
            ))}
          </ScrollView>
        )}
      </View>
      {submitError ? (
        <HelperText type="error">{submitError}</HelperText>
      ) : (
        <HelperText type="info">
          Save to apply the updated sharing list. Existing access will be removed if they are not included.
        </HelperText>
      )}
      <View style={styles.modalActions}>
        <Button onPress={onDismiss} disabled={loadingSubmit}>
          Cancel
        </Button>
        <Button mode="contained" onPress={onConfirm} loading={loadingSubmit} disabled={loadingSubmit}>
          Share
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
    selectedContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    selectedChip: {
      marginTop: 4,
      marginRight: 8,
    },
    resultsContainer: {
      marginTop: 12,
      maxHeight: 220,
    },
    resultsScroll: {
      maxHeight: 220,
    },
    resultItem: {
      paddingHorizontal: 0,
    },
    loadingState: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    loadingLabel: {
      fontSize: 13,
    },
    emptyState: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    emptyLabel: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
  });

