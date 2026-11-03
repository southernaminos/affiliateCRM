import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as api from './api';
import { secureStorage } from './storage';
import type { User } from './types';

const USER_KEY = 'sa.user';

interface AuthState {
  user: User | null;
  /** True until the saved session has been checked on launch. */
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const signOut = useCallback(async () => {
    api.setAuthToken(null);
    setUser(null);
    queryClient.clear();
    await secureStorage.remove(USER_KEY);
  }, [queryClient]);

  useEffect(() => {
    api.setUnauthorizedHandler(() => void signOut());
    return () => api.setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore a saved session on launch, then confirm the token still works.
  useEffect(() => {
    (async () => {
      try {
        const raw = await secureStorage.get(USER_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as User;
        api.setAuthToken(saved.token);
        setUser(saved);
        api.validateToken().catch((e) => {
          if (e instanceof api.ApiError && e.status !== 0) void signOut();
        });
      } catch {
        await secureStorage.remove(USER_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, [signOut]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const u = await api.login(username.trim(), password);
      api.setAuthToken(u.token);
      queryClient.clear();
      setUser(u);
      await secureStorage.set(USER_KEY, JSON.stringify(u));
    },
    [queryClient]
  );

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
