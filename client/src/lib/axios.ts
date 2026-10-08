import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';

import type { ApiResponse } from '@/api/types';
import { queryClient } from '@/lib/query-client';
import { useStore } from '@/stores/use-store';

/**
 * Resolve the backend base URL.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL  – explicit override (staging/prod or manual IP)
 *  2. Metro host           – the host that served this bundle, so the device
 *                            can always reach the dev backend on the same LAN
 *  3. localhost            – last-resort fallback
 */
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (metroHost ? `http://${metroHost}:3000` : 'http://localhost:3000');

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Attach the Better Auth bearer token to every request when signed in. */
api.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    // Expired/invalid token → drop the session (the mounted AuthGate then
    // redirects to login) and wipe cached data from the previous session.
    if (error.response?.status === 401) {
      useStore.getState().clearSession();
      queryClient.clear();
    }

    const payload = error.response?.data;
    const raw =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as { message: unknown }).message
        : undefined;

    /**
     * A validation failure arrives as `message: string[]`; other thrown
     * exceptions arrive as a plain string. Arrays are joined with semicolons
     * rather than left to `String()`, which would comma-join them — these
     * strings go straight into alert bodies and list subtitles, so
     * "profileId must be a valid UUID; search must be 80 characters or fewer"
     * reads as two problems rather than one garbled one.
     */
    let message: string | undefined;
    if (Array.isArray(raw)) {
      const parts = raw.filter((part): part is string => typeof part === 'string');
      message = parts.length > 0 ? parts.join('; ') : undefined;
    } else if (typeof raw === 'string' && raw.length > 0) {
      message = raw;
    } else if (raw !== undefined && raw !== null) {
      message = String(raw);
    }

    if (!message) message = error.message ?? 'Something went wrong';
    return Promise.reject(new ApiError(message, error.response?.status));
  },
);

/** Unwraps the backend `{ success, data }` envelope down to `data`. */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}