import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  Divider,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
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

type AuthMode = 'login' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

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
        keyboardAvoider: {
          flex: 1,
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
        segmentedWrapper: {
          marginTop: 4,
        },
        fieldGroup: {
          gap: 16,
        },
        formSurface: {
          padding: 28,
          borderRadius: 26,
          gap: 18,
          backgroundColor:
            colorScheme === 'dark'
              ? theme.colors.elevation.level3
              : theme.colors.surface,
        },
        primaryButton: {
          borderRadius: 14,
          paddingVertical: 6,
        },
        linkButton: {
          alignSelf: 'flex-end',
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
        checkboxRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        checkboxLabel: {
          flex: 1,
          fontSize: 13,
          color: theme.colors.onSurface,
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
      theme.colors.elevation.level3,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.surface,
      theme.colors.surfaceVariant,
    ]
  );

  const renderLoginForm = () => (
    <View style={styles.fieldGroup}>
      <TextInput
        label="Email"
        value={loginEmail}
        onChangeText={setLoginEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        left={<TextInput.Icon icon="email" />}
      />
      <TextInput
        label="Password"
        value={loginPassword}
        onChangeText={setLoginPassword}
        mode="outlined"
        secureTextEntry
        autoComplete="password"
        left={<TextInput.Icon icon="lock" />}
      />
      <Button
        mode="text"
        compact
        style={styles.linkButton}
        onPress={() => {}}>
        Forgot password?
      </Button>
      <Button mode="contained" onPress={() => {}} style={styles.primaryButton}>
        Log in
      </Button>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={styles.fieldGroup}>
      <TextInput
        label="Full name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        autoCapitalize="words"
        left={<TextInput.Icon icon="account" />}
      />
      <TextInput
        label="Email"
        value={registerEmail}
        onChangeText={setRegisterEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        left={<TextInput.Icon icon="email" />}
      />
      <TextInput
        label="Password"
        value={registerPassword}
        onChangeText={setRegisterPassword}
        mode="outlined"
        secureTextEntry
        autoComplete="password-new"
        left={<TextInput.Icon icon="lock" />}
      />
      <View style={styles.checkboxRow}>
        <Checkbox
          status={hasAcceptedTerms ? 'checked' : 'unchecked'}
          onPress={() => {
            setHasAcceptedTerms((prev) => !prev);
          }}
        />
        <Text style={styles.checkboxLabel}>
          I agree to the Terms of Service and Privacy Policy.
        </Text>
      </View>
      <Button
        mode="contained"
        onPress={() => {}}
        style={styles.primaryButton}
        disabled={!hasAcceptedTerms}>
        Create account
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={24}>
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
              <Text style={styles.title}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'login'
                  ? 'Sign in to keep your chord charts, song notes, and team moments in sync.'
                  : 'Join the community to build setlists, collaborate with your band, and unlock premium tools.'}
              </Text>
            </Animated.View>

            <SegmentedButtons
              style={styles.segmentedWrapper}
              value={mode}
              onValueChange={(value) => {
                if (value === 'login' || value === 'register') {
                  setMode(value);
                  if (value === 'register') {
                    setHasAcceptedTerms(false);
                  }
                }
              }}
              buttons={[
                { value: 'login', label: 'Login', icon: 'login' },
                { value: 'register', label: 'Register', icon: 'account-plus' },
              ]}
            />

            <Animated.View style={styles.contentStack} entering={FadeInUp.delay(120).duration(360)}>
              <Surface style={styles.formSurface} elevation={3}>
                {mode === 'login' ? renderLoginForm() : renderRegisterForm()}
              </Surface>

              <Surface style={styles.ssoSurface} elevation={1}>
                <Divider />
                <Text variant="labelLarge" style={styles.ssoLabel}>
                  Prefer social sign-in?
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
