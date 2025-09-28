import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RequestChordScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];

  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

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
          paddingVertical: 24,
          gap: 24,
        },
        headerGroup: {
          gap: 8,
        },
        title: {
          color: palette.text,
          fontSize: 28,
          fontWeight: '700',
        },
        subtitle: {
          color: palette.icon,
          fontSize: 15,
          lineHeight: 22,
        },
        formSurface: {
          borderRadius: 24,
          backgroundColor: theme.colors.surface,
          padding: 24,
          gap: 20,
        },
        helperText: {
          fontSize: 13,
          marginTop: 8,
        },
        submitButton: {
          borderRadius: 14,
        },
        confirmation: {
          color: theme.colors.primary,
          textAlign: 'center',
          fontWeight: '600',
        },
      }),
    [palette.background, palette.icon, palette.text, theme.colors.primary, theme.colors.surface]
  );

  const trimmedMessage = message.trim();
  const isInvalid = trimmedMessage.length < 10;

  const handleSubmit = () => {
    if (isInvalid) {
      return;
    }
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={16}>
        <Animated.ScrollView
          entering={FadeInUp.duration(320)}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View style={styles.headerGroup} entering={FadeInDown.duration(300)}>
            <Text style={styles.title}>Request a chord chart</Text>
            <Text style={styles.subtitle}>
              {"Let us know which chord chart you need. Our team will reach out when it's available."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).duration(320)}>
            <Surface style={styles.formSurface} elevation={1}>
              <View>
                <TextInput
                  label="Message"
                  value={message}
                  onChangeText={(value) => {
                    setMessage(value);
                    if (submitted) {
                      setSubmitted(false);
                    }
                  }}
                  mode="outlined"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholder="Share the song title, artist, and any details that will help us build the chart."
                />
                <HelperText type={isInvalid ? 'error' : 'info'} visible style={styles.helperText}>
                  {isInvalid
                    ? 'Add a little more detail so we can help track it down (10+ characters).'
                    : "We'll follow up at the email tied to your account."}
                </HelperText>
              </View>

              <Button
                mode="contained"
                style={styles.submitButton}
                disabled={isInvalid}
                onPress={handleSubmit}>
                Submit request
              </Button>

              {submitted && !isInvalid ? (
                <Text style={styles.confirmation}>
                  Thanks! We'll review your request shortly.
                </Text>
              ) : null}
            </Surface>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
