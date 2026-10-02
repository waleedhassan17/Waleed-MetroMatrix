// ============================================================================
// Going online / offline as a home-service provider.
//
// Going online carries ONE coarse position sample when — and only when — the
// phone has already granted location permission (a toggle never prompts).
// The server rounds it to ~500 m and uses it as the provider's service area
// only if they have not pinned one, or they opted in to "update my area when
// I go online" (backend services/serviceBase.js). Live trip positions are a
// separate thing and are never stored.
// ============================================================================

import { updateProviderOnlineStatus } from '../../networks/serviceProviders/providerNetwork';

const SAMPLE_TIMEOUT_MS = 4000;

async function coarseSampleIfPermitted(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const Location = require('expo-location');
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm?.status !== 'granted') return null;
    const recent = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    const pos =
      recent ||
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Low ?? 2 }),
        new Promise((resolve) => setTimeout(() => resolve(null), SAMPLE_TIMEOUT_MS)),
      ]));
    const c = (pos as any)?.coords;
    return c ? { latitude: c.latitude, longitude: c.longitude } : null;
  } catch {
    return null;
  }
}

export async function setProviderOnline(isOnline: boolean) {
  const base = isOnline ? await coarseSampleIfPermitted() : null;
  return updateProviderOnlineStatus(isOnline, base);
}
