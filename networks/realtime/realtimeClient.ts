// ============================================
// REALTIME SERVICE CLIENT (chat + call)
//
// The app talks to TWO backends. Everything else goes to the main Vercel API
// via networks/network/network.ts; chat and call go HERE, to the persistent
// realtime service on Heroku.
//
// This must be a separate axios instance, not the main one, because:
//   - the main instance's baseURL already ends in /api on a different host, and
//   - its request interceptor picks a token by matching the URL path prefix
//     ('users/', 'providers/', 'admin/'), which would resolve the wrong
//     audience for these routes.
//
// The realtime service verifies the SAME JWT the main backend issued at login
// (both share JWT_SECRET), so no separate authentication step exists.
// ============================================

import axios from 'axios';
import { REALTIME_BASE_URL } from '../../config/env';
import { ApiResponse } from '../../models/serviceProviders';
import { tokenForRequest } from '../network/tokenSelection';

const TIMEOUT = 30000;

const RealtimeAxios = axios.create({
  baseURL: `${REALTIME_BASE_URL}/api`,
  responseType: 'json',
  timeout: TIMEOUT,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

/**
 * The token for the realtime service. Passing `null` asks for the CURRENT
 * SESSION's own token rather than one matched to a path prefix — correct here
 * because these routes serve users, providers and doctors identically and the
 * server derives the caller's role from room membership, not from the token.
 */
export async function getRealtimeToken(): Promise<string | null> {
  const { token } = await tokenForRequest(null);
  return token;
}

RealtimeAxios.interceptors.request.use(async (config) => {
  const token = await getRealtimeToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function realtimeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const data =
    typeof options.body === 'string' && options.body.length
      ? JSON.parse(options.body)
      : undefined;
  const url = endpoint.replace(/^\//, '');

  try {
    const response = await RealtimeAxios.request({ url, method, data });
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload as ApiResponse<T>;
    }
    return { success: true, data: payload as T, message: 'Success' };
  } catch (error: any) {
    const isTimeout =
      error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
    const message = isTimeout
      ? 'Request timed out. Please check your connection and try again.'
      : error?.response?.data?.message || error?.message || 'Network error occurred';
    return { success: false, data: null as any, message };
  }
}

/** Register this device for push. Safe to call on every login. */
export async function registerPushToken(token: string): Promise<ApiResponse<void>> {
  return realtimeRequest<void>('/users/me/push-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/** Unregister on logout so a shared device stops receiving the old account's calls. */
export async function unregisterPushToken(token: string): Promise<ApiResponse<void>> {
  return realtimeRequest<void>('/users/me/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}
