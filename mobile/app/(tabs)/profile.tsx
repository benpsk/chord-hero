import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Divider,
  Icon,
  SegmentedButtons,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import {
  LanguagePreference,
  ThemePreference,
  usePreferences,
} from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import LoginRequiredDialog from '@/components/auth/LoginRequiredDialog';

function getInitials(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'CH';
  const words = trimmed.split(/\s+/).slice(0, 2);
  const chars = words.map((word) => word[0]?.toUpperCase() ?? '').join('');
  if (chars) return chars;
  return trimmed.slice(0, 2).toUpperCase();
}
export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    themePreference,
    setThemePreference,
    language,
    setLanguage,
  } = usePreferences();
  const { user, isAuthenticated, status, logout, loggingOut } = useAuth();
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        container: {
          flex: 1,
        },
        scrollView: {
          flex: 1,
        },
        contentContainer: {
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 24,
        },
        profileHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        userInfo: {
          flex: 1,
          gap: 4,
        },
        userName: {
          fontWeight: '700',
        },
        card: {
          borderRadius: 24,
          overflow: 'hidden',
          elevation: 1,
        },
        rowRipple: {
          overflow: 'hidden',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
          gap: 16,
        },
        rowText: {
          flex: 1,
          fontWeight: '600',
        },
        rowMeta: {
          color: theme.colors.primary,
          fontWeight: '600',
        },
        chevron: {
          margin: 0,
        },
        iconContainer: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        preferenceCard: {
          borderRadius: 24,
          paddingHorizontal: 20,
          paddingVertical: 20,
          gap: 20,
          elevation: 1,
        },
        preferenceRow: {
          gap: 12,
        },
        preferenceHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        preferenceTitle: {
          fontWeight: '600',
        },
        segmentedGroup: {
          alignSelf: 'stretch',
        },
        segmentButton: {
          flex: 1,
        },
        deleteCard: {
          borderRadius: 24,
          overflow: 'hidden',
          elevation: 1,
        },
        deleteText: {
          flex: 1,
          color: theme.colors.error,
          fontWeight: '600',
        },
      }),
    [theme.colors.error, theme.colors.background, theme.colors.primary]
  );

  const accentColor = theme.colors.primary;
  const mutedIconBackground = themePreference === 'dark' ? '#120B0B' : '#F4F4F6';
  const appVersion =
    Constants.expoConfig?.version ??
    '0.0.0';
  const isCheckingSession = status === 'checking';
  const isSignedIn = isAuthenticated;
  const displayName = isSignedIn
    ? (user?.name?.trim() ||
        user?.username?.split('@')[0]?.trim() ||
        user?.email?.split('@')[0]?.trim() ||
        'Musician')
    : isCheckingSession
    ? 'Checking session...'
    : 'Guest musician';
  const identityLabel = isSignedIn
    ? (user?.username ?? user?.email ?? 'Signed in')
    : isCheckingSession
    ? 'Please wait while we verify your account.'
    : 'Tap login to sync your charts.';
  const avatarLabel = isSignedIn ? getInitials(displayName) : 'CH';
  const handleLoginNavigate = useCallback(() => {
    router.push('/login');
  }, [router]);

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handlePromptLogin = useCallback(() => {
    setLoginPromptVisible(true);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);

  const handleThemeChange = (value: string) => {
    if (value === 'light' || value === 'dark' || value === 'system') {
      setThemePreference(value as ThemePreference);
    }
  };

  const handleLanguageChange = (value: string) => {
    if (value === 'en' || value === 'mm') {
      setLanguage(value as LanguagePreference);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Animated.ScrollView
          entering={FadeInUp.duration(340)}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          <Animated.View style={styles.profileHeader} entering={FadeInDown.duration(320)}>
            <Avatar.Text
              label={avatarLabel}
              size={54}
              style={{ backgroundColor: accentColor }}
              color={theme.colors.onPrimary}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text>{identityLabel}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).duration(320)}>
            <Surface style={styles.card} elevation={1}>
              <TouchableRipple
                onPress={() => {
                  router.push('/profile/chord-library');
                }}
                style={styles.rowRipple}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                    <Icon source="book-music" color={accentColor} size={22} />
                  </View>
                  <Text style={styles.rowText}>Chord Library</Text>
                  <Icon source="chevron-right" color={theme.colors.primary} size={20} />
                </View>
              </TouchableRipple>
              <Divider />
              <TouchableRipple
                onPress={() => {
                  if (!isAuthenticated) {
                    handlePromptLogin();
                    return;
                  }
                  router.push('/profile/request-chord');
                }}
                style={styles.rowRipple}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                    <Icon source="guitar-pick" color={accentColor} size={22} />
                  </View>
                  <Text style={styles.rowText}>Request Chord</Text>
                  <Icon source="chevron-right" color={theme.colors.primary} size={20} />
                </View>
              </TouchableRipple>
              <Divider />
              <TouchableRipple onPress={() => { }} style={styles.rowRipple}>
                <View style={styles.row}>
                  <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                    <Icon source="information-outline" color={accentColor} size={22} />
                  </View>
                  <Text style={styles.rowText}>Version</Text>
                  <Text style={styles.rowMeta}>v{appVersion}</Text>
                </View>
              </TouchableRipple>
            </Surface>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(140).duration(320)}>
            <Surface style={styles.preferenceCard} elevation={1}>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                    <Icon source="white-balance-sunny" color={accentColor} size={22} />
                  </View>
                  <Text style={styles.preferenceTitle}>Theme</Text>
                </View>
                <SegmentedButtons
                  value={themePreference}
                  onValueChange={handleThemeChange}
                  style={styles.segmentedGroup}
                  buttons={[
                    { value: 'system', label: 'System', style: styles.segmentButton },
                    { value: 'light', label: 'Light', style: styles.segmentButton },
                    { value: 'dark', label: 'Dark', style: styles.segmentButton },
                  ]}
                />
              </View>

              <Divider />

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                    <Icon source="translate" color={accentColor} size={22} />
                  </View>
                  <Text style={styles.preferenceTitle}>Language</Text>
                </View>
                <SegmentedButtons
                  value={language}
                  onValueChange={handleLanguageChange}
                  style={styles.segmentedGroup}
                  buttons={[
                    { value: 'en', label: 'EN', style: styles.segmentButton },
                    { value: 'mm', label: 'MM', style: styles.segmentButton },
                  ]}
                />
              </View>
            </Surface>
          </Animated.View>

          {isCheckingSession ? (
            <Animated.View entering={FadeInUp.delay(200).duration(320)}>
              <Button mode="contained" loading disabled>
                Checking account...
              </Button>
            </Animated.View>
          ) : isSignedIn ? (
            <>
              <Animated.View entering={FadeInUp.delay(200).duration(320)}>
                <Surface style={styles.deleteCard} elevation={1}>
                  <TouchableRipple onPress={() => { }} style={styles.rowRipple}>
                    <View style={styles.row}>
                      <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                        <Icon source="trash-can-outline" color={theme.colors.error} size={22} />
                      </View>
                      <Text style={styles.deleteText}>Delete Account</Text>
                      <Icon source="chevron-right" color={theme.colors.error} size={20} />
                    </View>
                  </TouchableRipple>
                </Surface>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(260).duration(320)}>
                <Button mode="contained" onPress={() => { void logout(); }} loading={loggingOut} disabled={loggingOut}>
                  LOGOUT
                </Button>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInUp.delay(200).duration(320)}>
              <Button mode="contained" onPress={handleLoginNavigate} disabled={isCheckingSession}>
                Login
              </Button>
            </Animated.View>
          )}
        </Animated.ScrollView>
        <LoginRequiredDialog
          visible={loginPromptVisible}
          onDismiss={handleDismissLoginPrompt}
          onLogin={handleNavigateToLogin}
        />
      </View>
    </SafeAreaView>
  );
}
