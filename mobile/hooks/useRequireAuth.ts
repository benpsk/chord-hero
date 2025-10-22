import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

type UseRequireAuthOptions = {
  redirectTo?: string;
};

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/login' } = options;
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isChecking, redirectTo, router]);

  return { isAuthenticated, isChecking };
}
