import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiPost, setAuthToken, ApiError } from '@/lib/api';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type AuthUser = {
  id?: string | number | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

type LoginPayload = {
  email: string;
  code: string;
};

type CodeResponse = {
  access_token?: string;
  data?: {
    access_token?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type MeResponse = AuthUser | { data: AuthUser };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isChecking: boolean;
  requestingCode: boolean;
  confirmingCode: boolean;
  loggingOut: boolean;
  requestCode: (email: string) => Promise<void>;
  confirmCode: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AUTH_TOKEN_STORAGE_KEY = 'mm_song_auth_token';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [requestingCode, setRequestingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const applyToken = useCallback((value: string | null) => {
    setToken(value);
    setAuthToken(value);
  }, []);

  const readPersistedToken = useCallback(async (): Promise<string | null> => {
    let secureValue: string | null | undefined = null;
    if (typeof SecureStore.getItemAsync === 'function') {
      try {
        secureValue = await SecureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY);
      } catch (error) {
        secureValue = null;
      }
    }
    if (secureValue !== null && secureValue !== undefined) {
      return secureValue;
    }
    try {
      const asyncValue = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      return asyncValue;
    } catch {
      return null;
    }
  }, []);

  const clearPersistedToken = useCallback(async () => {
    if (typeof SecureStore.deleteItemAsync === 'function') {
      try {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
      } catch {
        // fall through to AsyncStorage cleanup
      }
    }
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY).catch(() => undefined);
  }, []);

  const storeToken = useCallback(async (value: string) => {
    if (typeof SecureStore.setItemAsync === 'function') {
      try {
        await SecureStore.setItemAsync(AUTH_TOKEN_STORAGE_KEY, value);
        return;
      } catch {
        // fall through to AsyncStorage fallback
      }
    }
    await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, value);
  }, []);

  const extractAccessToken = useCallback((response: CodeResponse | null | undefined): string | undefined => {
    if (!response) return undefined;
    if (typeof response.access_token === 'string' && response.access_token.length > 0) {
      return response.access_token;
    }
    const nested = response.data?.access_token;
    if (typeof nested === 'string' && nested.length > 0) {
      return nested;
    }
    return undefined;
  }, []);

  const unwrapMeResponse = useCallback((response: MeResponse | null | undefined): AuthUser => {
    if (!response) {
      throw new Error('Invalid profile response.');
    }
    if ('data' in response && response.data) {
      return response.data;
    }
    return response;
  }, []);

  const fetchCurrentUser = useCallback(
    async (activeToken?: string | null) => {
      const tokenToUse = activeToken ?? token;
      if (!tokenToUse) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      setStatus('checking');
      try {
        const identityResponse = await apiPost<Record<string, never>, MeResponse>('/api/me', {});
        const identity = unwrapMeResponse(identityResponse);
        setUser(identity);
        setStatus('authenticated');
      } catch (error) {
        setUser(null);
        setStatus('unauthenticated');
        applyToken(null);
        await clearPersistedToken();
        throw error;
      }
    },
    [applyToken, clearPersistedToken, token, unwrapMeResponse]
  );

  useEffect(() => {
    let isActive = true;
    const bootstrap = async () => {
      try {
        const storedToken = await readPersistedToken();
        if (!isActive) return;
        if (storedToken) {
          applyToken(storedToken);
          try {
            await fetchCurrentUser(storedToken);
          } catch {
            if (isActive) {
              setStatus('unauthenticated');
            }
          }
        } else {
          setStatus('unauthenticated');
        }
      } catch {
        if (isActive) {
          setStatus('unauthenticated');
        }
      }
    };

    void bootstrap();
    return () => {
      isActive = false;
    };
  }, [applyToken, fetchCurrentUser, readPersistedToken]);

  const requestCode = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      if (!trimmed) {
        throw new Error('Email is required.');
      }
      setRequestingCode(true);
      try {
        await apiPost('/api/login', { username: trimmed });
      } catch (error) {
        throw new Error(toErrorMessage(error));
      } finally {
        setRequestingCode(false);
      }
    },
    []
  );

  const confirmCode = useCallback(
    async ({ email, code }: LoginPayload) => {
      const trimmedEmail = email.trim();
      const trimmedCode = code.trim();
      if (!trimmedEmail || !trimmedCode) {
        throw new Error('Email and code are required.');
      }

      setConfirmingCode(true);
      try {
        const response = await apiPost<{ code: string }, CodeResponse>('/api/code', {
          code: trimmedCode,
        });
        const accessToken = extractAccessToken(response);
        if (!accessToken) {
          throw new Error('Login response did not include an access token.');
        }
        await storeToken(accessToken);
        applyToken(accessToken);
        await fetchCurrentUser(accessToken);
      } catch (error) {
        throw new Error(toErrorMessage(error));
      } finally {
        setConfirmingCode(false);
      }
    },
    [applyToken, extractAccessToken, fetchCurrentUser, storeToken]
  );

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await clearPersistedToken();
    } finally {
      applyToken(null);
      setUser(null);
      setStatus('unauthenticated');
      setLoggingOut(false);
    }
  }, [applyToken, clearPersistedToken]);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      isAuthenticated: status === 'authenticated',
      isChecking: status === 'checking',
      requestingCode,
      confirmingCode,
      loggingOut,
      requestCode,
      confirmCode,
      logout,
      refreshUser,
    }),
    [
      confirmCode,
      loggingOut,
      logout,
      refreshUser,
      requestCode,
      requestingCode,
      confirmingCode,
      status,
      token,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AUTH_TOKEN_STORAGE_KEY };
