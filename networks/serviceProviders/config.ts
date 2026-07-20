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

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const data =
    typeof options.body === 'string' && options.body.length
      ? JSON.parse(options.body)
      : undefined;
  // Axios baseURL already ends in /api — strip the leading slash so
  // '/providers?x=1' resolves against it.
  const URL = endpoint.replace(/^\//, '');

  try {
    let response;
    switch (method) {
      case 'POST':
        response = await API.POST({ URL, data });
        break;
      case 'PUT':
        response = await API.PUT({ URL, data });
        break;
      case 'PATCH':
        response = await API.PATCH({ URL, data });
        break;
      case 'DELETE':
        response = await API.DELETE({ URL });
        break;
      default:
        response = await API.GET({ URL });
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
        error?.message ||
        'Network error occurred';
    return { success: false, data: null as any, message };
  }
}
