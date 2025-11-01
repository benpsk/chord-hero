import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PreferencesProvider, usePreferences } from '@/hooks/usePreferences';
import { AuthProvider } from '@/hooks/useAuth';
import { DarkTheme, LightTheme } from '@/constants/Theme';
import { PaperProvider } from 'react-native-paper';
import { AppStateStatus, Platform } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnlineManager } from '@/hooks/useOnlineManager';
import { useAppState } from '@/hooks/useAppState';

function onAppStateChange(status: AppStateStatus) {
  // React Query already supports in web browser refetch on window focus by default
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}
const queryClient = new QueryClient()

function RootLayoutContent() {
  useOnlineManager();
  useAppState(onAppStateChange);

  const { themePreference } = usePreferences();
  const navTheme = themePreference === 'dark' ? NavDarkTheme : NavDefaultTheme;
  const paperTheme = themePreference === 'dark' ? DarkTheme : LightTheme;
  const statusBarStyle = themePreference === 'dark' ? 'light' : 'dark';

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
        <QueryClientProvider client={queryClient}>
          <Stack 
            screenOptions={{
              headerTitleStyle:{
                fontSize: 18
              }
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="chart/[id]" options={{ title: "Chart" }} />
            <Stack.Screen name="profile/chord-library" options={{ title: 'Chord Library' }} />
            <Stack.Screen name="profile/request-chord" options={{ title: 'Request Chord' }} />
            <Stack.Screen name="song/[id]/index" options={{ title: 'Song' }} />
            <Stack.Screen name="song/[id]/edit" options={{ title: 'Edit Song' }} />
            <Stack.Screen name="playlist" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="song/create" options={{ title: 'Add Track' }} />
          </Stack>
          <StatusBar
            style={statusBarStyle}
            translucent={false}
            backgroundColor={paperTheme.colors.background}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <PreferencesProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </PreferencesProvider>
  );
}
