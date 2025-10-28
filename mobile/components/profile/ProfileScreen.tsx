import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from 'react-native-paper';

import {
  LanguagePreference,
  ThemePreference,
  usePreferences,
} from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';

import { ProfileHeader } from './ProfileHeader';
import { ProfileActionsCard } from './ProfileActionsCard';
import { ProfilePreferencesCard } from './ProfilePreferencesCard';
import { ProfileAccountActions } from './ProfileAccountActions';

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
  const { themePreference, setThemePreference, language, setLanguage } = usePreferences();
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
      }),
    [theme.colors.background]
  );

  const accentColor = theme.colors.primary;
  const mutedIconBackground = themePreference === 'dark' ? '#120B0B' : '#F4F4F6';
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const isCheckingSession = status === 'checking';
  const isSignedIn = isAuthenticated;

  const displayName = useMemo(() => {
    if (isSignedIn) {
      return (
        user?.name?.trim() ||
        user?.username?.split('@')[0]?.trim() ||
        user?.email?.split('@')[0]?.trim() ||
        'Musician'
      );
    }
    if (isCheckingSession) {
      return 'Checking session...';
    }
    return 'Guest musician';
  }, [isCheckingSession, isSignedIn, user?.email, user?.name, user?.username]);

  const identityLabel = useMemo(() => {
    if (isSignedIn) {
      return user?.username ?? user?.email ?? 'Signed in';
    }
    if (isCheckingSession) {
      return 'Please wait while we verify your account.';
    }
    return 'Tap login to sync your charts.';
  }, [isCheckingSession, isSignedIn, user?.email, user?.username]);

  const avatarLabel = isSignedIn ? getInitials(displayName) : 'CH';

  const handleThemeChange = useCallback(
    (value: ThemePreference) => {
      setThemePreference(value);
    },
    [setThemePreference]
  );

  const handleLanguageChange = useCallback(
    (value: LanguagePreference) => {
      setLanguage(value);
    },
    [setLanguage]
  );

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

  const handleOpenChordLibrary = useCallback(() => {
    router.push('/profile/chord-library');
  }, [router]);

  const handleRequestChord = useCallback(() => {
    router.push('/profile/request-chord');
  }, [router]);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Animated.ScrollView
          entering={FadeInUp.duration(340)}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHeader
            displayName={displayName}
            identityLabel={identityLabel}
            avatarLabel={avatarLabel}
            accentColor={accentColor}
          />

          <ProfileActionsCard
            onPressLibrary={handleOpenChordLibrary}
            onPressRequestChord={handleRequestChord}
            onRequireLogin={handlePromptLogin}
            appVersion={appVersion}
            accentColor={accentColor}
            mutedIconBackground={mutedIconBackground}
            isAuthenticated={isSignedIn}
          />

          <ProfilePreferencesCard
            themePreference={themePreference}
            onThemeChange={handleThemeChange}
            language={language}
            onLanguageChange={handleLanguageChange}
            accentColor={accentColor}
            mutedIconBackground={mutedIconBackground}
          />

          <ProfileAccountActions
            isCheckingSession={isCheckingSession}
            isSignedIn={isSignedIn}
            loggingOut={loggingOut}
            onLogout={handleLogout}
            onLogin={handleLoginNavigate}
            mutedIconBackground={mutedIconBackground}
          />
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
