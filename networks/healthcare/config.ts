import { ApiResponse } from '../../models/serviceProviders';
import API from '../network/network';

// Healthcare endpoints are served by the main backend under /api/v1/healthcare
// (and admin healthcare endpoints under /api/v1/admin). The shared axios `API`
// instance already injects the auth token and points at API_URL (which ends in /api).
const HEALTHCARE_PREFIX = '/v1/healthcare';
const HEALTHCARE_ADMIN_PREFIX = '/v1/admin';

// Offline demo fallback ONLY. When true, networks/healthcare/* return the
// bundled fixtures from dummyData.ts instead of hitting the API.
// Default is FALSE: the module runs against the real backend.
export const USE_HEALTHCARE_DUMMY_DATA = false;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string; // JSON string (kept for backwards-compat with existing callers)
  data?: any; // optional pre-parsed body
  params?: Record<string, any>;
  headers?: Record<string, string>;
};

/**
 * Core request helper for healthcare endpoints.
 *
 * The backend wraps every response as `{ success, data, message }` (some list
 * endpoints also include `count`/`pagination`). This helper unwraps that envelope
 * so callers receive the inner payload directly on `.data`, matching the dummy-data
 * contract the rest of the app already relies on.
 */
async function request<T>(
  prefix: string,
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const URL = `${prefix}${endpoint}`;
  const data =
    options.data !== undefined
      ? options.data
      : options.body
      ? JSON.parse(options.body)
      : undefined;

  try {
    let response: any;
    switch (method) {
      case 'POST':
        response = await API.POST({ URL, data, headers: options.headers });
        break;
      case 'PUT':
        response = await API.PUT({ URL, data, headers: options.headers });
        break;
      case 'PATCH':
        response = await API.PATCH({ URL, data, headers: options.headers });
        break;
      case 'DELETE':
        response = await API.DELETE({ URL, params: options.params, headers: options.headers });
        break;
      case 'GET':
      default:
        response = await API.GET({ URL, params: options.params, headers: options.headers });
        break;
    }

    const body = response?.data ?? {};
    // Unwrap `{ success, data, message }`. If the body isn't enveloped, pass it through.
    const payload =
      body && typeof body === 'object' && 'data' in body ? body.data : body;
    return {
      success: body?.success ?? true,
      data: payload as T,
      message: body?.message || 'Success',
    };
  } catch (error: any) {
    const body = error?.response?.data;
    return {
      success: false,
      data: null as any,
      message: body?.error || body?.message || error?.message || 'Network error occurred',
    };
  }
}

/** Request against /api/v1/healthcare/* */
export async function healthcareApiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  return request<T>(HEALTHCARE_PREFIX, endpoint, options);
}

/** Request against /api/v1/admin/* (healthcare admin endpoints) */
export async function healthcareAdminApiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  return request<T>(HEALTHCARE_ADMIN_PREFIX, endpoint, options);
}
