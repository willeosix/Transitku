import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from './api';
import { AuthUser, LoginPayload, LoginResponse, RegisterPayload } from '../types/transit';

export interface StoredAuth {
  token: string | null;
  user: AuthUser | null;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', {
    identity: payload.identity.trim(),
    password: payload.password,
  });

  const { token, record } = response.data;

  await Promise.all([
    AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token),
    AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(record)),
  ]);

  return { token, record };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const response = await api.post<AuthUser>('/auth/register', {
    name: payload.name.trim(),
    email: payload.email.trim(),
    password: payload.password,
    passwordConfirm: payload.passwordConfirm,
  });

  return response.data;
}

export async function logoutUser(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY),
    AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY),
  ]);
}

export async function getStoredAuth(): Promise<StoredAuth> {
  try {
    const [token, rawUser] = await Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
      AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
    ]);

    if (!token || !rawUser) {
      return { token: null, user: null };
    }

    const user = JSON.parse(rawUser) as AuthUser;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}
