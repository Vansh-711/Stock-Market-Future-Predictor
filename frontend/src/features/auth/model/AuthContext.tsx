import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '@/features/auth/api/authApi';
import type { LoginPayload, SignupPayload, User } from '@/features/auth/model/types';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await authApi.getMe();
    setUser(me);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    authApi
      .getMe()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = useCallback(
    async (payload: LoginPayload) => {
      await authApi.login(payload);
      await refreshUser();
    },
    [refreshUser],
  );

  const handleSignup = useCallback(
    async (payload: SignupPayload) => {
      await authApi.signup(payload);
      await authApi.login({ username: payload.username, password: payload.password });
      await refreshUser();
    },
    [refreshUser],
  );

  const handleLogout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login: handleLogin, signup: handleSignup, logout: handleLogout, refreshUser }),
    [handleLogin, handleLogout, handleSignup, isLoading, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
