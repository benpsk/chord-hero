import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Divider, Icon, SegmentedButtons, Surface, Text } from 'react-native-paper';

import type { LanguagePreference, ThemePreference } from '@/hooks/usePreferences';

type ProfilePreferencesCardProps = {
  themePreference: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
  language: LanguagePreference;
  onLanguageChange: (value: LanguagePreference) => void;
  accentColor: string;
  mutedIconBackground: string;
  enteringDelay?: number;
};

export function ProfilePreferencesCard({
  themePreference,
  onThemeChange,
  language,
  onLanguageChange,
  accentColor,
  mutedIconBackground,
  enteringDelay = 140,
}: ProfilePreferencesCardProps) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        surface: {
          borderRadius: 24,
          paddingHorizontal: 20,
          paddingVertical: 20,
          gap: 20,
        },
        row: {
          gap: 12,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        iconContainer: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontWeight: '600',
        },
        segmentedGroup: {
          alignSelf: 'stretch',
        },
        segmentButton: {
          flex: 1,
        },
      }),
    []
  );

  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(320)}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.row}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
              <Icon source="white-balance-sunny" color={accentColor} size={22} />
            </View>
            <Text style={styles.title}>Theme</Text>
          </View>
          <SegmentedButtons
            value={themePreference}
            onValueChange={(value) => {
              if (value === 'light' || value === 'dark' || value === 'system') {
                onThemeChange(value);
              }
            }}
            style={styles.segmentedGroup}
            buttons={[
              { value: 'system', label: 'System', style: styles.segmentButton },
              { value: 'light', label: 'Light', style: styles.segmentButton },
              { value: 'dark', label: 'Dark', style: styles.segmentButton },
            ]}
          />
        </View>

        <Divider />

        <View style={styles.row}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
              <Icon source="translate" color={accentColor} size={22} />
            </View>
            <Text style={styles.title}>Language</Text>
          </View>
          <SegmentedButtons
            value={language}
            onValueChange={(value) => {
              if (value === 'en' || value === 'mm') {
                onLanguageChange(value);
              }
            }}
            style={styles.segmentedGroup}
            buttons={[
              { value: 'en', label: 'EN', style: styles.segmentButton },
              { value: 'mm', label: 'MM', style: styles.segmentButton },
            ]}
          />
        </View>
      </Surface>
    </Animated.View>
  );
}
