import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ColorSchemeName } from 'react-native';

import { useSystemColorScheme } from '@/hooks/useSystemColorScheme';

import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'system' | 'light' | 'dark';
type LanguagePreference = 'en' | 'mm';

const THEME_PREFERENCE_STORAGE_KEY = '@chord-hero/theme-preference';

type PreferencesContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
  resolvedColorScheme: 'light' | 'dark';
  systemColorScheme: ColorSchemeName;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [language, setLanguage] = useState<LanguagePreference>('en');

  useEffect(() => {
    let isMounted = true;

    const loadThemePreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

        if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
          if (isMounted) {
            setThemePreferenceState(storedPreference);
          }
        }
      } catch (error) {
        // Silently ignore persistence errors to avoid blocking UI rendering.
      }
    };

    void loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    void AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  }, []);

  const resolvedColorScheme: 'light' | 'dark' = useMemo(() => {
    if (themePreference === 'light') {
      return 'light';
    }

    if (themePreference === 'dark') {
      return 'dark';
    }

    return (systemColorScheme ?? 'light') === 'dark' ? 'dark' : 'light';
  }, [systemColorScheme, themePreference]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      themePreference,
      setThemePreference,
      language,
      setLanguage,
      resolvedColorScheme,
      systemColorScheme,
    }),
    [language, resolvedColorScheme, setThemePreference, systemColorScheme, themePreference]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }

  return context;
}

export type { ThemePreference, LanguagePreference };
