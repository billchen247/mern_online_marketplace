import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/services';
import { refreshAccessToken, setAccessToken, setAuthFailureHandler } from '../api/client';
import type { Role, User } from '../types';
import { hasAnyRole, hasRole } from '../utils/roles';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Re-fetch the profile (e.g. after the seller role is granted). */
  refreshUser: () => Promise<User | null>;
  hasRole: (r: Role) => boolean;
  hasAnyRole: (r: Role[]) => boolean;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const me = await authApi.me();
          if (alive) setUser(me);
        } catch {
          setAccessToken(null);
        }
      }
      if (alive) setLoading(false);
    })();
    setAuthFailureHandler(() => setUser(null));
    return () => {
      alive = false;
      setAuthFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const s = await authApi.login({ email, password });
    setAccessToken(s.accessToken);
    setUser(s.user);
    return s.user;
  }, []);
  const register = useCallback(async (name: string, email: string, password: string) => {
    const s = await authApi.register({ name, email, password });
    setAccessToken(s.accessToken);
    setUser(s.user);
    return s.user;
  }, []);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      hasRole: (r) => hasRole(user, r),
      hasAnyRole: (r) => hasAnyRole(user, r),
    }),
    [user, loading, login, register, logout, refreshUser],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
