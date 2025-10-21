import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, TextInput, Text, useTheme } from 'react-native-paper';

type PasswordlessLoginProps = {
  onRequestCode?: (email: string) => void;
  onConfirmCode?: (params: { email: string; code: string }) => void;
};

export function PasswordlessLogin({
  onRequestCode,
  onConfirmCode,
}: PasswordlessLoginProps) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSendingCooldown, setIsSendingCooldown] = useState(false);
  const [canConfirm, setCanConfirm] = useState(false);
  const [helper, setHelper] = useState<string | undefined>(undefined);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: 18,
        },
        input: {
          width: '100%',
        },
        sendRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        timer: {
          flex: 1,
          color: theme.colors.onSurfaceVariant,
        },
        actionButton: {
          alignSelf: 'flex-end',
        },
        helperText: {
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [theme.colors.onSurfaceVariant]
  );

  useEffect(() => {
    if (!isSendingCooldown || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        return next >= 0 ? next : 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSendingCooldown, secondsRemaining]);

  useEffect(() => {
    if (isSendingCooldown && secondsRemaining === 0) {
      setIsSendingCooldown(false);
      setHelper('Need a new code? Tap send again.');
    }
  }, [isSendingCooldown, secondsRemaining]);

  const handleSendCode = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setHelper('Enter your email to receive a login code.');
      return;
    }
    setHelper('We sent a 6-digit code to your inbox.');
    setIsSendingCooldown(true);
    setCanConfirm(true);
    setSecondsRemaining(60);
    onRequestCode?.(trimmedEmail);
  };

  const handleConfirmCode = () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setHelper('Enter the code to continue.');
      return;
    }
    setHelper('Code confirmed. You are ready to continue.');
    onConfirmCode?.({ email: email.trim(), code: trimmedCode });
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        style={styles.input}
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        returnKeyType="done"
      />
      <View style={styles.sendRow}>
        <Text style={styles.timer}>
          {isSendingCooldown ? `Resend in ${secondsRemaining}s` : 'Ready to send a code'}
        </Text>
        <Button
          mode="contained"
          onPress={handleSendCode}
          disabled={isSendingCooldown}
        >
          Send code
        </Button>
      </View>
      <TextInput
        mode="outlined"
        style={styles.input}
        label="Login code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        returnKeyType="done"
      />
      <Button
        mode="contained"
        onPress={handleConfirmCode}
        disabled={!canConfirm}
        style={styles.actionButton}
      >
        Confirm
      </Button>
      {!!helper && <Text style={styles.helperText}>{helper}</Text>}
    </View>
  );
}
