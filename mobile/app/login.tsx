import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Chip,
  Divider,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const SSO_OPTIONS = [
  {
    key: 'facebook',
    label: 'Continue with Facebook',
    icon: 'facebook',
    buttonColor: '#1877F2',
    textColor: '#FFFFFF',
  },
  {
    key: 'google',
    label: 'Continue with Gmail',
    icon: 'google',
    buttonColor: '#FFFFFF',
    textColor: '#1F1F1F',
  },
] as const;

export default function LoginScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
        },
        scrollContent: {
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingVertical: 32,
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          width: '100%',
          maxWidth: 480,
          gap: 32,
        },
        hero: {
          alignItems: 'center',
          gap: 14,
        },
        contentStack: {
          width: '100%',
          gap: 20,
        },
        title: {
          fontSize: 30,
          fontWeight: '700',
          color: palette.text,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 16,
          color: theme.colors.onSurfaceVariant,
          textAlign: 'center',
        },
        ssoButton: {
          borderRadius: 14,
        },
        ssoSurface: {
          padding: 22,
          borderRadius: 24,
          gap: 16,
          backgroundColor:
            colorScheme === 'dark'
              ? theme.colors.elevation.level2
              : theme.colors.surfaceVariant,
        },
        ssoLabel: {
          fontSize: 13,
          color: theme.colors.onSurfaceVariant,
          textAlign: 'center',
          letterSpacing: 0.15,
        },
        helperText: {
          fontSize: 12,
          textAlign: 'center',
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [
      colorScheme,
      palette.background,
      palette.text,
      theme.colors.elevation.level2,
      theme.colors.onSurfaceVariant,
      theme.colors.surfaceVariant,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Animated.ScrollView
        entering={FadeInUp.duration(300)}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        <Animated.View style={styles.content} entering={FadeInUp.delay(50).duration(350)}>
          <Animated.View style={styles.hero} entering={FadeInDown.delay(80).duration(320)}>
            <Avatar.Icon size={70} icon="music-note-eighth" />
            <Chip icon="flash-outline" compact>
              Inspire your rehearsals
            </Chip>
            <Text style={styles.title}>Sign in to Lyric</Text>
            <Text style={styles.subtitle}>
              Choose a social account to sync your chord charts, notes, and
              team moments instantly.
            </Text>
          </Animated.View>

          <Animated.View style={styles.contentStack} entering={FadeInUp.delay(120).duration(360)}>
            <Surface style={styles.ssoSurface} elevation={1}>
              <Divider />
              <Text variant="labelLarge" style={styles.ssoLabel}>
                Continue with a connected account
              </Text>
              {SSO_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  mode={option.buttonColor === '#FFFFFF' ? 'contained-tonal' : 'contained'}
                  icon={option.icon}
                  onPress={() => {}}
                  style={styles.ssoButton}
                  contentStyle={{ justifyContent: 'center' }}
                  buttonColor={option.buttonColor}
                  textColor={option.textColor}>
                  {option.label}
                </Button>
              ))}
              <Text style={styles.helperText}>
                We never post to your social accounts without permission.
              </Text>
            </Surface>
          </Animated.View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
