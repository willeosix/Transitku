import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getStoredAuth,
  loginUser,
  logoutUser,
  registerUser,
  saveFavoriteCorridors,
} from '../services/authService';
import { AuthUser, LoginPayload, RegisterPayload } from '../types/transit';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  favoriteCorridors: string[];
  isHydrating: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavoriteCorridor: (corridorId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [favoriteCorridors, setFavoriteCorridors] = useState<string[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let active = true;
    getStoredAuth()
      .then((stored) => {
        if (active) {
          setToken(stored.token);
          setUser(stored.user);
          setFavoriteCorridors(stored.favoriteCorridors);
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
    if (Array.isArray(result.record.favorite_corridors)) {
      setFavoriteCorridors(result.record.favorite_corridors);
    }
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    await registerUser(payload);
    const result = await loginUser({
      identity: payload.email,
      password: payload.password,
    });
    setToken(result.token);
    setUser(result.record);
    setFavoriteCorridors(
      Array.isArray(result.record.favorite_corridors)
        ? result.record.favorite_corridors
        : []
    );
  }, []);

  const signOut = useCallback(async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  }, []);

  const toggleFavoriteCorridor = useCallback(
    async (corridorId: string) => {
      const next = favoriteCorridors.includes(corridorId)
        ? favoriteCorridors.filter((id) => id !== corridorId)
        : [...favoriteCorridors, corridorId];
      setFavoriteCorridors(next);
      await saveFavoriteCorridors(next, user);
    },
    [favoriteCorridors, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        favoriteCorridors,
        isHydrating,
        signIn,
        signUp,
        signOut,
        toggleFavoriteCorridor,
      }}
    >
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
