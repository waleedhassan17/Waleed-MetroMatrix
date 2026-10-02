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
import { rememberSearch } from '../../services/analytics/rankingContext';

export type OriginSource = 'address' | 'device';
export type SearchOrigin = { lat: number; lng: number; source: OriginSource; label?: string };
type Origin = SearchOrigin | null;

let originPromise: Promise<Origin> | null = null;
let originAt = 0;
/** A position the customer chose for this session ("Use my location"), overriding the address. */
let originOverride: Origin = null;
/** Short-lived, so a different account signing in on this phone is not matched from the last one's home. */
const ORIGIN_TTL_MS = 5 * 60 * 1000;

const isRealPoint = (c: any): c is { latitude: number; longitude: number } =>
  !!c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && !(c.latitude === 0 && c.longitude === 0);

/**
 * Where "near me" is, for provider search: a position the customer picked
 * this session, else their default saved address — only if it was actually
 * located (the server reports unlocated addresses as `coordinates: null`) —
 * else the phone's last known position, read only if location permission was
 * already granted, never prompted for from a list screen — else nothing, and
 * the server searches every city without inventing distances.
 *
 * Search used to send no location at all, and later sent the saved-address
 * placeholder (Lahore centre), so every customer was matched from the city
 * centre. Cached for the session; `resetSearchOrigin` after the customer
 * edits their addresses.
 */
export async function searchOrigin(): Promise<Origin> {
  if (originOverride) return originOverride;
  if (!originPromise || Date.now() - originAt > ORIGIN_TTL_MS) {
    originAt = Date.now();
    originPromise = (async (): Promise<Origin> => {
      const res = await apiRequest<any[]>('/user/addresses', { bestEffort: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const located = list.filter((a) => isRealPoint(a?.coordinates));
      const home = located.find((a) => a?.isDefault) || located[0];
      if (home) {
        return {
          lat: home.coordinates.latitude,
          lng: home.coordinates.longitude,
          source: 'address',
          label: home.label || 'Saved address',
        };
      }
      try {
        const Location = require('expo-location');
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm?.status === 'granted') {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos?.coords) {
            return { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device', label: 'Current location' };
          }
        }
      } catch {
        // no location module or no fix — search everywhere
      }
      return null;
    })().catch(() => null);
  }
  return originPromise;
}

/**
 * Ask for the phone's position NOW — only ever from an explicit tap
 * ("Use my location"). Returns null when the customer declines or no fix
 * arrives; the result becomes the search origin for this session.
 */
export async function requestDeviceOrigin(): Promise<Origin> {
  try {
    const Location = require('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm?.status !== 'granted') return null;
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 })) ||
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced ?? 3 }));
    if (!pos?.coords) return null;
    originOverride = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device', label: 'Current location' };
    return originOverride;
  } catch {
    return null;
  }
}

/** Forget cached origins — after the customer edits addresses, or signs out. */
export function resetSearchOrigin() {
  originPromise = null;
  originOverride = null;
}

/** Sort names the server understands (services/discoveryPipeline.js normalizeSort). */
export type ProviderSort = 'best' | 'nearest' | 'rating' | 'reviews' | 'price_low' | 'price_high';

export interface ProviderSearchFilters {
  minRating?: number;
  maxPrice?: number;
  /** Available now: online, recently seen, inside working hours. */
  available?: boolean;
  /** A promise: only providers known to be within this many km. */
  maxDistanceKm?: number;
}

export interface ProviderSearchArea {
  nearYou: boolean;
  radiusKm: number | null;
  widened: boolean;
}

export async function fetchProviders(params: {
  category: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: ProviderSort;
  filters?: ProviderSearchFilters;
}): Promise<
  ApiResponse<{ providers: Provider[]; pagination: Pagination; searchArea?: ProviderSearchArea; searchId?: string; rankingSource?: string }> & {
    origin?: Origin;
  }
> {
  const origin = await searchOrigin();
  const f = params.filters || {};
  const queryParams = new URLSearchParams({
    category: params.category,
    page: String(params.page || 1),
    limit: String(params.limit || 15),
    ...(params.search && { search: params.search }),
    ...(params.sort && { sortBy: params.sort }),
    ...(f.minRating ? { minRating: String(f.minRating) } : {}),
    ...(f.maxPrice ? { maxPrice: String(f.maxPrice) } : {}),
    ...(f.available ? { available: 'true' } : {}),
    ...(f.maxDistanceKm ? { maxDistanceKm: String(f.maxDistanceKm) } : {}),
    ...(origin && { lat: String(origin.lat), lng: String(origin.lng) }),
  });

  const response = await apiRequest<{ providers: Provider[]; pagination: Pagination; searchArea?: ProviderSearchArea; searchId?: string; rankingSource?: string }>(
    `/providers?${queryParams}`
  );
  if (response.success && response.data) {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 15);
    rememberSearch(
      response.data.searchId,
      (response.data.providers || []).map((p: any) => String(p.id || p._id)),
      (page - 1) * limit
    );
  }
  return { ...response, origin };
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

export interface ServiceBase {
  latitude: number | null;
  longitude: number | null;
  /** default = not set; city = city centroid; profile = pinned; go_online = sampled on going online. */
  source: 'default' | 'city' | 'profile' | 'go_online' | 'seed';
  updatedAt: string | null;
}

/**
 * Go online/offline. When going online the app may attach one coarse position
 * sample; the server only uses it as the service base if the provider has no
 * pinned base or opted in to "update my area when I go online".
 */
export async function updateProviderOnlineStatus(
  isOnline: boolean,
  base?: { latitude: number; longitude: number } | null
): Promise<ApiResponse<{ isOnline: boolean; serviceBase?: ServiceBase }>> {
  return apiRequest('/provider/status', {
    method: 'PATCH',
    body: JSON.stringify({ isOnline, ...(isOnline && base ? { base } : {}) }),
  });
}

/** Pin the area this provider works from (stored rounded to ~500 m). */
export async function setProviderServiceBase(
  point: { latitude: number; longitude: number }
): Promise<ApiResponse<{ serviceBase: ServiceBase }>> {
  return apiRequest('/provider/location/base', {
    method: 'PUT',
    body: JSON.stringify(point),
  });
}

/** "Still here" while online and in the foreground — keeps "available now" honest. */
export async function sendProviderHeartbeat(): Promise<ApiResponse<{ recorded: boolean; nextInSeconds: number }>> {
  return apiRequest('/provider/heartbeat', { method: 'POST', bestEffort: true });
}
