import React, { useMemo } from 'react';
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
export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    themePreference,
    setThemePreference,
    language,
    setLanguage,
  } = usePreferences();

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
          fontSize: 22,
          fontWeight: '700',
        },
        userEmail: {
          fontSize: 14,
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
          paddingVertical: 18,
          gap: 16,
        },
        rowText: {
          flex: 1,
          fontSize: 16,
          fontWeight: '600',
        },
        rowMeta: {
          color: theme.colors.primary,
          fontSize: 14,
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
          fontSize: 16,
          fontWeight: '600',
        },
        segmentedGroup: {
          alignSelf: 'stretch',
        },
        segmentButton: {
          flex: 1,
        },
        logoutContainer: {
          paddingHorizontal: 24,
          paddingBottom: 24,
          paddingTop: 12,
        },
        logoutButton: {
          borderRadius: 16,
          width: '100%',
        },
        deleteCard: {
          borderRadius: 24,
          overflow: 'hidden',
          elevation: 1,
        },
        deleteText: {
          flex: 1,
          color: theme.colors.error,
          fontSize: 16,
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
              label="JC"
              size={72}
              style={{ backgroundColor: accentColor }}
              color={theme.colors.onPrimary}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Jeff Clay</Text>
              <Text style={styles.userEmail}>jeffclay@gmail.com</Text>
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
        </Animated.ScrollView>

        <Animated.View entering={FadeInUp.delay(260).duration(320)} style={styles.logoutContainer}>
          <Button mode="contained" style={styles.logoutButton} onPress={() => { }}>
            LOGOUT
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
