// ============================================
// Shopping Module — Base Axios Instance
// ============================================
//
// Single shared Axios instance for the entire shopping module.
// All screen-level API files import from this file.
//
// Features:
// • Auth interceptor: attaches JWT from AsyncStorage
// • 401 handling: attempts token refresh, then clears auth
// • Response transformer: normalises { data, meta, error } envelope
// • __DEV__-only request/response logging

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
  clearAuthData,
} from '../../utils/storage_utils/storageUtils';
import { API_URL } from '../network/network';

// ── Configuration ───────────────────────────

const SHOPPING_BASE = `${API_URL}/shopping`;
const TIMEOUT_MS = 30_000;

// ── Normalised response envelope ────────────

export interface ShoppingApiEnvelope<T = any> {
  data: T;
  meta: {
    page?: number;
    totalPages?: number;
    totalItems?: number;
    hasMore?: boolean;
  } | null;
  error: string | null;
}

// ── Axios Instance ──────────────────────────

const shoppingAxios = axios.create({
  baseURL: SHOPPING_BASE,
  timeout: TIMEOUT_MS,
  responseType: 'json',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ── Flag to prevent concurrent refresh attempts ──
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

// ── Request Interceptor ─────────────────────

shoppingAxios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Attach JWT
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Dev-only logging
    if (__DEV__) {
      console.log(
        `🛒 [Shopping API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url ?? ''}`,
      );
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('🛒 [Shopping API] Request interceptor error:', error.message);
    }
    return Promise.reject(error);
  },
);

// ── Response Interceptor ────────────────────

shoppingAxios.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`🛒 [Shopping API] ✅ ${response.status} ${response.config.url ?? ''}`);
    }

    // ── Normalise response envelope ───────
    // API may return:
    //   { data, meta, error }          → pass through
    //   { success, data, message }     → normalise
    //   raw array / object             → wrap
    const raw = response.data;

    if (raw && typeof raw === 'object' && 'data' in raw) {
      // Already has `data` key — normalise meta/error
      response.data = {
        data: raw.data,
        meta: raw.meta ?? raw.pagination ?? null,
        error: raw.error ?? null,
      } as ShoppingApiEnvelope;
    } else {
      // Raw payload — wrap in envelope
      response.data = {
        data: raw,
        meta: null,
        error: null,
      } as ShoppingApiEnvelope;
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (__DEV__) {
      console.error('🛒 [Shopping API] ❌', {
        status: error.response?.status,
        url: originalRequest?.url,
        message: error.message,
      });
    }

    // ── 401 → attempt token refresh ──────
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request already triggered refresh — queue this one
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(shoppingAxios(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint (uses the base API, not shopping-specific)
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken: string = data.accessToken ?? data.token;
        const newRefreshToken: string | undefined = data.refreshToken;

        if (newAccessToken) {
          await saveAuthTokens(newAccessToken, newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          onTokenRefreshed(newAccessToken);
          return shoppingAxios(originalRequest);
        }

        throw new Error('Refresh response did not contain a token');
      } catch (refreshError) {
        if (__DEV__) {
          console.error('🛒 [Shopping API] Token refresh failed — logging out', refreshError);
        }
        await clearAuthData();
        refreshSubscribers = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Convenience Typed Helpers ───────────────

export async function shoppingGet<T>(url: string, params?: Record<string, any>) {
  const res = await shoppingAxios.get<ShoppingApiEnvelope<T>>(url, { params });
  return res.data;
}

export async function shoppingPost<T>(url: string, body?: any) {
  const res = await shoppingAxios.post<ShoppingApiEnvelope<T>>(url, body);
  return res.data;
}

export async function shoppingPut<T>(url: string, body?: any) {
  const res = await shoppingAxios.put<ShoppingApiEnvelope<T>>(url, body);
  return res.data;
}

export async function shoppingPatch<T>(url: string, body?: any) {
  const res = await shoppingAxios.patch<ShoppingApiEnvelope<T>>(url, body);
  return res.data;
}

export async function shoppingDelete<T>(url: string) {
  const res = await shoppingAxios.delete<ShoppingApiEnvelope<T>>(url);
  return res.data;
}

export default shoppingAxios;
