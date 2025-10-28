import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Button, Icon, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';

type ProfileAccountActionsProps = {
  isCheckingSession: boolean;
  isSignedIn: boolean;
  loggingOut: boolean;
  onLogout: () => void;
  onLogin: () => void;
  mutedIconBackground: string;
  enteringDelay?: number;
  onDeleteAccount?: () => void;
};

export function ProfileAccountActions({
  isCheckingSession,
  isSignedIn,
  loggingOut,
  onLogout,
  onLogin,
  mutedIconBackground,
  enteringDelay = 200,
  onDeleteAccount,
}: ProfileAccountActionsProps) {
  const theme = useTheme();
  const deleteTextStyle = React.useMemo(
    () => ({
      color: theme.colors.error,
      fontWeight: '600' as const,
    }),
    [theme.colors.error]
  );

  if (isCheckingSession) {
    return (
      <Animated.View entering={FadeInUp.delay(enteringDelay).duration(320)}>
        <Button mode="contained" loading disabled>
          Checking account...
        </Button>
      </Animated.View>
    );
  }

  if (!isSignedIn) {
    return (
      <Animated.View entering={FadeInUp.delay(enteringDelay).duration(320)}>
        <Button mode="contained" onPress={onLogin}>
          Login
        </Button>
      </Animated.View>
    );
  }

  return (
    <>
      <Animated.View entering={FadeInUp.delay(enteringDelay).duration(320)}>
        <Surface style={styles.deleteCard} elevation={1}>
          <TouchableRipple onPress={onDeleteAccount ?? (() => {})} style={styles.rowRipple}>
            <View style={styles.row}>
              <View style={[styles.iconContainer, { backgroundColor: mutedIconBackground }]}>
                <Icon source="trash-can-outline" color={theme.colors.error} size={22} />
              </View>
              <Text style={[styles.rowText, deleteTextStyle]}>Delete Account</Text>
              <Icon source="chevron-right" color={theme.colors.error} size={20} />
            </View>
          </TouchableRipple>
        </Surface>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(enteringDelay + 60).duration(320)}>
        <Button mode="contained" onPress={onLogout} loading={loggingOut} disabled={loggingOut}>
          LOGOUT
        </Button>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  deleteCard: {
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
});
