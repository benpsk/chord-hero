import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useMutation } from '@tanstack/react-query';

import { apiPost, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function RequestChordScreen() {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const { isAuthenticated, isChecking } = useRequireAuth();

  const feedbackMutation = useMutation<{ message?: string }, ApiError, { message: string }>({
    mutationFn: (payload) => apiPost('/api/feedback', payload),
    onSuccess: (data) => {
      setMessage('');
      setBackendError(null);
      const messageText = data?.message ?? "Thanks! We'll review your request shortly.";
      setSuccessMessage(messageText);
      setSnackbarMessage(messageText);
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
          paddingHorizontal: 20,
          paddingVertical: 16,
          gap: 16,
        },
        headerGroup: {
          gap: 8,
        },
        title: {
          fontSize: 18,
          fontWeight: '700',
        },
        subtitle: {
          color: theme.colors.secondary,
          lineHeight: 22,
        },
        formContainer: {
          gap: 16,
        },
        messageInput: {
          minHeight: 180,
        },
        submitButton: {
          borderRadius: 14,
          alignSelf: 'flex-start',
        },
        errorText: {
          color: theme.colors.error,
          textAlign: 'center',
        },
        snackbar: {
          marginHorizontal: 16,
          backgroundColor: theme.colors.primary,
        },
      }),
    [theme.colors.primary, theme.colors.background, theme.colors.secondary, theme.colors.error]
  );

  const trimmedMessage = message.trim();
  const isInvalid = trimmedMessage.length < 10;
  const handleSubmit = () => {
    if (isInvalid || feedbackMutation.isPending) {
      return;
    }
    setSubmitted(false);
    setBackendError(null);
    setSuccessMessage(null);
    setSnackbarMessage(null);
    feedbackMutation.mutate({ message: trimmedMessage });
  };

  if (isChecking || !isAuthenticated) {
    return null;
  }

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
            <Text style={styles.title}>Request a chord</Text>
            <Text style={styles.subtitle}>
              {"Let us know which chord chart you need. Our team will reach out when it's available."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).duration(320)}>
            <View style={styles.formContainer}>
              <View>
                <TextInput
                  label="Message"
                  value={message}
                  style={styles.messageInput}
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
                  numberOfLines={8}
                  textAlignVertical="top"
                  placeholder="Share the song title, artist, and any details that will help us build the chart."
                />
              </View>

              <Button
                mode="contained"
                style={styles.submitButton}
                disabled={isInvalid || feedbackMutation.isPending}
                loading={feedbackMutation.isPending}
                onPress={handleSubmit}>
                Submit request
              </Button>

              {backendError ? <Text style={styles.errorText}>{backendError}</Text> : null}
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
      <Snackbar
        visible={typeof snackbarMessage === 'string' && snackbarMessage.length > 0}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarMessage(null),
          textColor: theme.colors.onPrimary,
        }}
        style={styles.snackbar}
        theme={{
          colors: {
            inverseSurface: theme.colors.primary,
            inverseOnSurface: theme.colors.onPrimary,
          },
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}
