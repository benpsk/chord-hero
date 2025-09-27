import { usePreferences } from '@/hooks/usePreferences';

export function useColorScheme() {
  const { resolvedColorScheme } = usePreferences();
  return resolvedColorScheme;
}
