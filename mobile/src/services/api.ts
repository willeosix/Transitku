import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = 'https://aglio.stei.site/api/v1';
export const API_KEY = 'transitku-637e9facc71d864b';
export const AUTH_TOKEN_STORAGE_KEY = '@transitku/auth_token';
export const AUTH_USER_STORAGE_KEY = '@transitku/auth_user';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.headers.set('X-API-Key', API_KEY);

    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      return config;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

interface PocketBaseErrorBody {
  message?: string;
  error?: string;
  data?: Record<string, { message?: string }>;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Terjadi gangguan jaringan. Periksa koneksi internet Anda'
): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<PocketBaseErrorBody>;
    if (!axiosError.response) {
      return 'Tidak dapat terhubung ke server TransitKu. Coba lagi beberapa saat';
    }

    const body = axiosError.response.data;
    if (body?.data && typeof body.data === 'object') {
      const fieldMessages = Object.entries(body.data)
        .map(([field, detail]) => (detail?.message ? `${field}: ${detail.message}` : null))
        .filter((msg): msg is string => Boolean(msg));
      if (fieldMessages.length > 0) {
        return fieldMessages.join('\n');
      }
    }

    if (body?.message) {
      return body.message;
    }

    if (body?.error) {
      return body.error;
    }

    return `Permintaan gagal dengan kode ${axiosError.response.status}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
