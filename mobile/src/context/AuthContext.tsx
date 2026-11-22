import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getStoredAuth,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/authService';
import { AuthUser, LoginPayload, RegisterPayload } from '../types/transit';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isHydrating: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let active = true;
    getStoredAuth()
      .then((stored) => {
        if (active) {
          setToken(stored.token);
          setUser(stored.user);
        }
      })
      .finally(() => {
        if (active) {
          setIsHydrating(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const result = await loginUser(payload);
    setToken(result.token);
    setUser(result.record);
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    await registerUser(payload);
    const result = await loginUser({
      identity: payload.email,
      password: payload.password,
    });
    setToken(result.token);
    setUser(result.record);
  }, []);

  const signOut = useCallback(async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isHydrating, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipanggil di dalam AuthProvider');
  }
  return ctx;
}
