import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

type ProfileActionsCardProps = {
  onPressLibrary: () => void;
  onPressRequestChord: () => void;
  onRequireLogin: () => void;
  appVersion: string;
  accentColor: string;
  mutedIconBackground: string;
  isAuthenticated: boolean;
  enteringDelay?: number;
};

export function ProfileActionsCard({
  onPressLibrary,
  onPressRequestChord,
  onRequireLogin,
  appVersion,
  accentColor,
  mutedIconBackground,
  isAuthenticated,
  enteringDelay = 80,
}: ProfileActionsCardProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        surface: {
          borderRadius: 24,
          overflow: 'hidden',
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
        iconContainer: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rowText: {
          flex: 1,
          fontWeight: '600',
        },
        meta: {
          color: theme.colors.primary,
          fontWeight: '600',
        },
      }),
    [theme.colors.primary]
  );

  const handleRequestChord = () => {
    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }
    onPressRequestChord();
  };

  return (
    <Animated.View entering={FadeInUp.delay(enteringDelay).duration(320)}>
      <Surface style={styles.surface} elevation={1}>
        <TouchableRipple onPress={onPressLibrary} style={styles.rowRipple}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
              <Icon source="book-music" color={accentColor} size={22} />
            </View>
            <Text style={styles.rowText}>Chord Library</Text>
            <Icon source="chevron-right" color={theme.colors.primary} size={20} />
          </View>
        </TouchableRipple>

        <Divider />

        <TouchableRipple onPress={handleRequestChord} style={styles.rowRipple}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
              <Icon source="guitar-pick" color={accentColor} size={22} />
            </View>
            <Text style={styles.rowText}>Request Chord</Text>
            <Icon source="chevron-right" color={theme.colors.primary} size={20} />
          </View>
        </TouchableRipple>

        <Divider />

        <TouchableRipple onPress={() => {}} style={styles.rowRipple}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
              <Icon source="information-outline" color={accentColor} size={22} />
            </View>
            <Text style={styles.rowText}>Version</Text>
            <Text style={styles.meta}>v{appVersion}</Text>
          </View>
        </TouchableRipple>
      </Surface>
    </Animated.View>
  );
}
