// ============================================
// PROVIDER NETWORK APIs
// ============================================

import {
  Provider,
  ProviderDetails,
  Pagination,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest } from './config';

type Origin = { lat: number; lng: number } | null;
let originPromise: Promise<Origin> | null = null;
let originAt = 0;
/** Short-lived, so a different account signing in on this phone is not matched from the last one's home. */
const ORIGIN_TTL_MS = 5 * 60 * 1000;

/**
 * Where "near me" is, for provider search: the customer's default saved
 * address, else the phone's last known position — read only if location
 * permission was already granted, never prompted for from a list screen —
 * else nothing, and the server searches the whole city.
 *
 * Search used to send no location at all, so every customer was matched from
 * the centre of Lahore: "nearby" was fiction and providers across town never
 * appeared. Cached for the session; `resetSearchOrigin` after the customer
 * edits their addresses.
 */
async function searchOrigin(): Promise<Origin> {
  if (!originPromise || Date.now() - originAt > ORIGIN_TTL_MS) {
    originAt = Date.now();
    originPromise = (async () => {
      const res = await apiRequest<any[]>('/user/addresses', { bestEffort: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const home = list.find((a) => a?.isDefault) || list[0];
      const c = home?.coordinates;
      if (c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && (c.latitude || c.longitude)) {
        return { lat: c.latitude, lng: c.longitude };
      }
      try {
        const Location = require('expo-location');
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm?.status === 'granted') {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos?.coords) return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        // no location module or no fix — search the city
      }
      return null;
    })().catch(() => null);
  }
  return originPromise;
}

export function resetSearchOrigin() {
  originPromise = null;
}

export async function fetchProviders(params: {
  category: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  filters?: {
    minRating?: number;
    maxPrice?: number;
    verified?: boolean;
    available?: boolean;
  };
}): Promise<ApiResponse<{ providers: Provider[]; pagination: Pagination }>> {
    const origin = await searchOrigin();
    const queryParams = new URLSearchParams({
    category: params.category,
    page: String(params.page || 1),
    limit: String(params.limit || 15),
    ...(params.search && { search: params.search }),
    ...(params.sort && { sort: params.sort }),
    ...(params.filters && { filters: JSON.stringify(params.filters) }),
    ...(origin && { lat: String(origin.lat), lng: String(origin.lng) }),
  });

  return apiRequest<{ providers: Provider[]; pagination: Pagination }>(
    `/providers?${queryParams}`
  );
}

export async function fetchProviderDetails(
  providerId: string
): Promise<ApiResponse<ProviderDetails>> {
    return apiRequest<ProviderDetails>(`/providers/${providerId}`);
}

export async function fetchProviderProfile(): Promise<ApiResponse<ProviderDetails>> {
    return apiRequest<ProviderDetails>('/provider/profile');
}

export async function updateProviderProfile(
  data: Partial<Provider>
): Promise<ApiResponse<Provider>> {
    return apiRequest<Provider>('/provider/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateProviderOnlineStatus(
  isOnline: boolean
): Promise<ApiResponse<{ isOnline: boolean }>> {
    return apiRequest('/provider/status', {
    method: 'PATCH',
    body: JSON.stringify({ isOnline }),
  });
}
