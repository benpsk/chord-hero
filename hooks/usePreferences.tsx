import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ColorSchemeName } from 'react-native';

import { useSystemColorScheme } from '@/hooks/useSystemColorScheme';

type ThemePreference = 'system' | 'light' | 'dark';
type LanguagePreference = 'en' | 'mm';

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
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [language, setLanguage] = useState<LanguagePreference>('en');

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
    [language, resolvedColorScheme, systemColorScheme, themePreference]
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
