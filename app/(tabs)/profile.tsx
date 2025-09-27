import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
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

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  LanguagePreference,
  ThemePreference,
  usePreferences,
} from '@/hooks/usePreferences';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];
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
          backgroundColor: palette.background,
        },
        container: {
          flex: 1,
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
          color: palette.text,
          fontSize: 22,
          fontWeight: '700',
        },
        userEmail: {
          color: palette.icon,
          fontSize: 14,
        },
        card: {
          borderRadius: 24,
          backgroundColor: theme.colors.surface,
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
          color: palette.text,
          fontSize: 16,
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
          backgroundColor: theme.colors.surface,
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
          color: palette.text,
          fontSize: 16,
          fontWeight: '600',
        },
        segmentedGroup: {
          alignSelf: 'stretch',
        },
        segmentButton: {
          flex: 1,
        },
        logoutButton: {
          marginTop: 'auto',
          borderRadius: 16,
        },
        deleteCard: {
          borderRadius: 24,
          backgroundColor: theme.colors.surface,
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
    [palette.background, palette.icon, palette.text, theme.colors.error, theme.colors.surface]
  );

  const accentColor = theme.colors.primary;
  const mutedIconBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F4F4F6';

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(340)}
        contentContainerStyle={styles.container}
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
                router.push('/profile/personal-information');
              }}
              style={styles.rowRipple}>
              <View style={styles.row}>
                <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                  <Icon source="map-marker-account" color={accentColor} size={22} />
                </View>
                <Text style={styles.rowText}>Personal Information</Text>
                <Icon source="chevron-right" color={palette.icon} size={20} style={styles.chevron} />
              </View>
            </TouchableRipple>
            <Divider />
            <TouchableRipple
              onPress={() => {
                router.push('/subscription');
              }}
              style={styles.rowRipple}>
              <View style={styles.row}>
                <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                  <Icon source="wallet-membership" color={accentColor} size={22} />
                </View>
                <Text style={styles.rowText}>Subscription</Text>
                <Icon source="chevron-right" color={palette.icon} size={20} style={styles.chevron} />
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
            <TouchableRipple onPress={() => {}} style={styles.rowRipple}>
              <View style={styles.row}>
                <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                  <Icon source="trash-can-outline" color={theme.colors.error} size={22} />
                </View>
                <Text style={styles.deleteText}>Delete Account</Text>
                <Icon source="chevron-right" color={palette.icon} size={20} style={styles.chevron} />
              </View>
            </TouchableRipple>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(240).duration(320)}>
          <Button mode="contained" style={styles.logoutButton} onPress={() => {}}>
            LOGOUT
          </Button>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
