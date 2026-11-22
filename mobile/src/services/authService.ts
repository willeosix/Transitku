import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from './api';
import { AuthUser, LoginPayload, LoginResponse, RegisterPayload } from '../types/transit';

export const FAVORITE_CORRIDORS_STORAGE_KEY = '@transitku/favorite_corridors';

export interface StoredAuth {
  token: string | null;
  user: AuthUser | null;
  favoriteCorridors: string[];
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', {
    identity: payload.identity.trim(),
    password: payload.password,
  });

  const { token, record } = response.data;
  const serverFavorites = Array.isArray(record.favorite_corridors)
    ? record.favorite_corridors
    : [];

  await Promise.all([
    AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token),
    AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(record)),
    AsyncStorage.setItem(FAVORITE_CORRIDORS_STORAGE_KEY, JSON.stringify(serverFavorites)),
  ]);

  return { token, record };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const response = await api.post<AuthUser>('/auth/register', {
    name: payload.name.trim(),
    email: payload.email.trim(),
    password: payload.password,
    passwordConfirm: payload.passwordConfirm,
    favorite_corridors: [],
  });

  return response.data;
}

export async function logoutUser(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY),
    AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY),
  ]);
}

export async function saveFavoriteCorridors(
  corridorIds: string[],
  user?: AuthUser | null
): Promise<void> {
  await AsyncStorage.setItem(FAVORITE_CORRIDORS_STORAGE_KEY, JSON.stringify(corridorIds));

  if (user?.id) {
    try {
      const updated = await api.patch<AuthUser>(`/users/${encodeURIComponent(user.id)}`, {
        favorite_corridors: corridorIds,
      });
      await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(updated.data));
    } catch {
      return;
    }
  }
}

export async function getStoredAuth(): Promise<StoredAuth> {
  try {
    const [token, rawUser, rawFavorites] = await Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
      AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
      AsyncStorage.getItem(FAVORITE_CORRIDORS_STORAGE_KEY),
    ]);

    let favoriteCorridors: string[] = [];
    if (rawFavorites) {
      const parsed = JSON.parse(rawFavorites);
      if (Array.isArray(parsed)) {
        favoriteCorridors = parsed.filter((id): id is string => typeof id === 'string');
      }
    }

    if (!token || !rawUser) {
      return { token: null, user: null, favoriteCorridors };
    }

    const user = JSON.parse(rawUser) as AuthUser;
    if (favoriteCorridors.length === 0 && Array.isArray(user.favorite_corridors)) {
      favoriteCorridors = user.favorite_corridors;
    }

    return { token, user, favoriteCorridors };
  } catch {
    return { token: null, user: null, favoriteCorridors: [] };
  }
}
