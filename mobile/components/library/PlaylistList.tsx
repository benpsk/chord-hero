import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  Menu,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { PlaylistSummary } from '@/hooks/usePlaylists';

type Props = {
  playlists: PlaylistSummary[];
  isAuthenticated: boolean;
  isChecking: boolean;
  isInitialLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  onNavigateToLogin: () => void;
  onCreatePlaylist: () => void;
  onOpen: (playlist: PlaylistSummary) => void;
  onShare: (playlist: PlaylistSummary) => void;
  onEdit: (playlist: PlaylistSummary) => void;
  onDelete: (playlist: PlaylistSummary) => void;
  onLeave: (playlist: PlaylistSummary) => void;
  activeMenuId: number | string | null;
  setActiveMenuId: (value: number | string | null) => void;
};

export function PlaylistList({
  playlists,
  isAuthenticated,
  isChecking,
  isInitialLoading,
  isError,
  errorMessage,
  onRetry,
  onNavigateToLogin,
  onCreatePlaylist,
  onOpen,
  onShare,
  onEdit,
  onDelete,
  onLeave,
  activeMenuId,
  setActiveMenuId,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  if (!isAuthenticated) {
    return (
      <Animated.View style={styles.authRequired} entering={FadeInUp.delay(100).duration(320)}>
        <Text style={styles.authTitle}>Sign in to manage your playlists</Text>
        <Text style={styles.authSubtitle}>
          Create custom song collections, organize set lists, and sync them across your devices once you log in.
        </Text>
        <Button mode="contained" onPress={onNavigateToLogin}>
          Go to login
        </Button>
      </Animated.View>
    );
  }

  if (isChecking || isInitialLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator animating size="small" />
        <Text style={styles.loadingText}>
          {isChecking ? 'Checking your account…' : 'Loading your playlists…'}
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <Animated.View style={styles.errorState} entering={FadeInUp.delay(120).duration(360)}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <Button mode="contained" icon="reload" onPress={onRetry}>
          Try again
        </Button>
      </Animated.View>
    );
  }

  if (playlists.length === 0) {
    return (
      <Animated.View style={styles.emptyState} entering={FadeInUp.delay(120).duration(360)}>
        <Text style={styles.emptyTitle}>No playlists yet</Text>
        <Text style={styles.emptySubtitle}>
          Create a playlist to organize songs for your next performance or study session.
        </Text>
        <Button mode="contained" icon="playlist-plus" onPress={onCreatePlaylist}>
          Create a playlist
        </Button>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(140).duration(360)}>
      {playlists.map((playlist, index) => {
        const isOwner = playlist.is_owner === true;

        return (
          <TouchableRipple key={playlist.id} onPress={() => onOpen(playlist)} borderless={false}>
            <Animated.View entering={FadeInUp.delay(160 + index * 40).duration(320)}>
              {index > 0 && <View style={styles.rowSpacing} />}
              <View style={styles.libraryRow}>
                <View style={styles.artwork} />
                <View style={styles.libraryInfo}>
                  <Text style={styles.libraryTitle}>{playlist.name}</Text>
                  <Text style={styles.librarySubtitle}>
                    {playlist.total} song{playlist.total === 1 ? '' : 's'}
                  </Text>
                </View>
                <Menu
                  key={String(activeMenuId === playlist.id)}
                  visible={activeMenuId === playlist.id}
                  onDismiss={() => setActiveMenuId(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={22}
                      style={styles.menuTrigger}
                      onPress={() => setActiveMenuId(playlist.id)}
                    />
                  }
                >
                  {isOwner ? (
                    <>
                      <Menu.Item
                        leadingIcon="share-variant"
                        title="Share"
                        onPress={() => onShare(playlist)}
                      />
                      <Menu.Item
                        leadingIcon="pencil"
                        title="Update"
                        onPress={() => onEdit(playlist)}
                      />
                      <Menu.Item
                        leadingIcon="delete"
                        title="Delete"
                        onPress={() => onDelete(playlist)}
                      />
                    </>
                  ) : (
                    <Menu.Item
                      leadingIcon="logout"
                      title="Leave"
                      onPress={() => onLeave(playlist)}
                    />
                  )}
                </Menu>
              </View>
              {index < playlists.length - 1 && <Divider style={styles.inlineDivider} />}
            </Animated.View>
          </TouchableRipple>
        );
      })}
    </Animated.View>
  );
}

const createStyles = (colors: { [key: string]: string }) =>
  StyleSheet.create({
  authRequired: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
  loadingState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 120,
  },
  loadingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  errorState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 120,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 120,
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  rowSpacing: {
    height: 12,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artwork: {
    backgroundColor: colors.tertiary,
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  libraryInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  libraryTitle: {
    fontWeight: '700',
  },
  librarySubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  menuTrigger: {
    margin: 0,
  },
  inlineDivider: {
    marginTop: 12,
  },
  });
