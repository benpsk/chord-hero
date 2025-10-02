import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { PreferencesProvider } from '@/hooks/usePreferences';
import {
  Provider as PaperProvider,
} from 'react-native-paper';
import { DarkTheme, LightTheme } from '@/constants/Theme';

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  const navTheme = colorScheme === 'dark' ? NavDarkTheme : NavDefaultTheme;
  const paperTheme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="chart/[id]" options={{ title: "Chart" }} />
          <Stack.Screen name="profile/chord-library" options={{ title: 'Chord Library' }} />
          <Stack.Screen name="profile/request-chord" options={{ title: 'Request Chord' }} />
          <Stack.Screen name="song/[id]" options={{ title: 'Song' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar
          style={statusBarStyle}
          translucent={false}
          backgroundColor={paperTheme.colors.background}
        />
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
      <RootLayoutContent />
    </PreferencesProvider>
  );
}
