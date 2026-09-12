// ============================================
// NETWORK CONFIGURATION & HELPERS (Home Services)
//
// HS6 Part A rewrite. Previously this file hardcoded a THIRD API host and
// used raw fetch with no Authorization header and no timeout — every
// authenticated call 401'd the moment USE_DUMMY_DATA went false. All requests
// now ride the shared axios instance in networks/network/network.ts, which
// points at the single API_BASE_URL, injects the stored token, applies the
// 30s timeout (NFR-01) and handles 401 → auth-clear centrally.
// ============================================

import { API } from '../network/network';
import { API_BASE_URL, USE_HOMESERVICE_DUMMY_DATA } from '../../config/env';
import { ApiResponse } from '../../models/serviceProviders';

export const BASE_URL = API_BASE_URL;

// Offline demo fallback ONLY (defaults to false in config/env.ts).
export const USE_DUMMY_DATA = USE_HOMESERVICE_DUMMY_DATA;

export type RequestOptions = RequestInit & {
  /**
   * Mark the request survivable. Its failure is logged quietly rather than as
   * an error, exactly as in networks/healthcare/config.ts.
   *
   * For a call the caller has ALREADY decided to shrug off, a red LogBox is
   * not a diagnosis — it is a false alarm on top of a screen that is working.
   * GET /bookings/active is the case in point: it only decides whether a Book
   * button reads "Book" or "View request", the caller degrades to "Book" when
   * it fails, and an app build talking to a backend deployed before that route
   * existed gets a 404 on every list focus.
   */
  bestEffort?: boolean;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const data =
    typeof options.body === 'string' && options.body.length
      ? JSON.parse(options.body)
      : undefined;
  // Axios baseURL already ends in /api — strip the leading slash so
  // '/providers?x=1' resolves against it.
  const URL = endpoint.replace(/^\//, '');

  // Carried as a header purely so it reaches the interceptor on error.config;
  // the backend ignores it.
  const headers = options.bestEffort
    ? { ...((options.headers as any) || {}), 'x-best-effort': '1' }
    : (options.headers as any);

  try {
    let response;
    switch (method) {
      case 'POST':
        response = await API.POST({ URL, data, headers });
        break;
      case 'PUT':
        response = await API.PUT({ URL, data, headers });
        break;
      case 'PATCH':
        response = await API.PATCH({ URL, data, headers });
        break;
      case 'DELETE':
        response = await API.DELETE({ URL, headers });
        break;
      default:
        response = await API.GET({ URL, headers });
    }

    const payload = response.data;
    // Home-services endpoints return the ApiResponse wrapper already; keep
    // the { success, data, message, pagination? } contract for every caller.
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload as ApiResponse<T>;
    }
    return { success: true, data: payload as T, message: 'Success' };
  } catch (error: any) {
    // NFR-01: a hung request must surface a readable message, not hang the screen.
    const isTimeout =
      error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
    const message = isTimeout
      ? 'Request timed out. Please check your connection and try again.'
      : error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Network error occurred';
    // A refusal can carry a payload, and throwing it away costs a round trip:
    // POST /bookings answers a duplicate request with 409 AND the booking that
    // already exists, precisely so the caller can open it instead of asking
    // for it again. Failures without a body still get `null`, so every
    // `if (!response.success)` branch behaves exactly as before.
    return {
      success: false,
      data: (error?.response?.data?.data ?? null) as any,
      message,
    };
  }
}
