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
import { useMutation } from '@tanstack/react-query';

import { apiPost, ApiError } from '@/lib/api';

export default function RequestChordScreen() {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const feedbackMutation = useMutation<{ message?: string }, ApiError, { message: string }>({
    mutationFn: (payload) => apiPost('/api/feedback', payload),
    onSuccess: (data) => {
      setMessage('');
      setBackendError(null);
      setSuccessMessage(data?.message ?? null);
      setSubmitted(true);
    },
    onError: (error) => {
      setSubmitted(false);
      if (error instanceof ApiError) {
        setBackendError(error.message);
      } else {
        setBackendError('Something went wrong. Please try again.');
      }
    },
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
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
          fontSize: 28,
          fontWeight: '700',
        },
        subtitle: {
          color: theme.colors.secondary,
          fontSize: 15,
          lineHeight: 22,
        },
        formSurface: {
          borderRadius: 24,
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
    [theme.colors.primary, theme.colors.background, theme.colors.secondary]
  );

  const trimmedMessage = message.trim();
  const isInvalid = trimmedMessage.length < 10;
  const helperText = backendError
    ? backendError
    : isInvalid
    ? 'Add a little more detail so we can help track it down (10+ characters).'
    : "We'll follow up at the email tied to your account.";
  const helperType = backendError || isInvalid ? 'error' : 'info';

  const handleSubmit = () => {
    if (isInvalid || feedbackMutation.isPending) {
      return;
    }
    setSubmitted(false);
    setBackendError(null);
    setSuccessMessage(null);
    feedbackMutation.mutate({ message: trimmedMessage });
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
                    if (backendError) {
                      setBackendError(null);
                    }
                    if (successMessage) {
                      setSuccessMessage(null);
                    }
                  }}
                  mode="outlined"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholder="Share the song title, artist, and any details that will help us build the chart."
                />
                <HelperText type={helperType} visible style={styles.helperText}>
                  {helperText}
                </HelperText>
              </View>

              <Button
                mode="contained"
                style={styles.submitButton}
                disabled={isInvalid || feedbackMutation.isPending}
                loading={feedbackMutation.isPending}
                onPress={handleSubmit}>
                Submit request
              </Button>

              {submitted ? (
                <Text style={styles.confirmation}>
                  {successMessage ?? "Thanks! We'll review your request shortly."}
                </Text>
              ) : null}
            </Surface>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
