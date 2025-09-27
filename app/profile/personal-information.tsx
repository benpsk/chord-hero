import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Divider,
  HelperText,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PersonalInformationScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];

  const [fullName, setFullName] = useState('Jeff Clay');
  const [email, setEmail] = useState('jeffclay@gmail.com');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
        },
        keyboardAvoider: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
          gap: 24,
        },
        headerStack: {
          gap: 8,
        },
        title: {
          fontSize: 28,
          fontWeight: '700',
          color: palette.text,
        },
        subtitle: {
          fontSize: 15,
          color: theme.colors.onSurfaceVariant,
        },
        card: {
          borderRadius: 26,
          padding: 24,
          gap: 20,
          backgroundColor: theme.colors.surface,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: palette.text,
        },
        fieldGroup: {
          gap: 16,
        },
        buttonRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
        },
        saveButton: {
          borderRadius: 14,
        },
        helperText: {
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [palette.background, palette.text, theme.colors.onSurfaceVariant, theme.colors.surface]
  );

  const isPasswordMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={24}>
        <Animated.ScrollView
          entering={FadeInUp.duration(320)}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View style={styles.headerStack} entering={FadeInDown.delay(60).duration(300)}>
            <Text style={styles.title}>Personal information</Text>
            <Text style={styles.subtitle}>
              Keep your profile up to date so your team always knows who is sharing new music.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).duration(340)}>
            <Surface style={styles.card} elevation={2}>
              <Text style={styles.sectionTitle}>Profile details</Text>
              <Divider />
              <View style={styles.fieldGroup}>
                <TextInput
                  label="Full name"
                mode="outlined"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                left={<TextInput.Icon icon="account" />}
              />
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                left={<TextInput.Icon icon="email" />}
              />
            </View>
            <View style={styles.buttonRow}>
              <Button mode="contained" onPress={() => {}} style={styles.saveButton}>
                Save changes
              </Button>
            </View>
            </Surface>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(160).duration(360)}>
            <Surface style={styles.card} elevation={2}>
              <Text style={styles.sectionTitle}>Password</Text>
              <Divider />
              <View style={styles.fieldGroup}>
                <TextInput
                  label="Current password"
                mode="outlined"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoComplete="password"
                left={<TextInput.Icon icon="lock" />}
              />
              <TextInput
                label="New password"
                mode="outlined"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="password-new"
                left={<TextInput.Icon icon="lock-check" />}
              />
              <TextInput
                label="Confirm new password"
                mode="outlined"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
                left={<TextInput.Icon icon="lock-check" />}
                error={showPasswordMismatch}
              />
              <HelperText type={showPasswordMismatch ? 'error' : 'info'} visible style={styles.helperText}>
                {showPasswordMismatch
                  ? 'Passwords do not match. Please double-check.'
                  : 'Use at least 8 characters, mixing letters, numbers, and symbols.'}
              </HelperText>
            </View>
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={() => {}}
                style={styles.saveButton}
                disabled={!currentPassword || !isPasswordMatching}>
                Update password
              </Button>
            </View>
            </Surface>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
