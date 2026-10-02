// ============================================
// TRACKING SERIALIZERS
// ============================================

import {
  TrackingProvider,
  TrackingData,
  RouteInfo,
} from '../../models/serviceProviders';
import { toServiceCategory } from './commonSerializer';

export function trackingProviderSerializer(data: any): TrackingProvider {
  return {
    id: data?.id || '',
    name: data?.name || '',
    phone: data?.phone || data?.phoneNumber || '',
    image: data?.image || '',
    service: data?.service || '',
    specialty: data?.specialty || '',
    rating: data?.rating || 0,
    reviews: data?.reviews || 0,
    experience: data?.experience || '',
    verified: data?.verified ?? false,
    category: toServiceCategory(data?.category),
  };
}

export function routeInfoSerializer(data: any): RouteInfo {
  return {
    coordinates: (data?.coordinates || []).map((coord: any) => ({
      latitude: coord?.latitude || coord?.lat || 0,
      longitude: coord?.longitude || coord?.lng || 0,
    })),
    distance: data?.distance || '',
    distanceValue: data?.distanceValue || 0,
    duration: data?.duration || '',
    durationValue: data?.durationValue || 0,
  };
}

/** A real point or null — 0,0 is "unknown", never a place to draw a marker. */
function pointOrNull(p: any): { latitude: number; longitude: number } | null {
  const latitude = Number(p?.latitude);
  const longitude = Number(p?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function trackingDataSerializer(payload: any): TrackingData {
  return {
    provider: trackingProviderSerializer(payload?.provider || {}),
    providerLocation: pointOrNull(payload?.providerLocation),
    userLocation: pointOrNull(payload?.userLocation),
    route: payload?.route ? routeInfoSerializer(payload.route) : null,
    trackingStatus: {
      status: payload?.trackingStatus?.status || payload?.status || 'en_route',
      message: payload?.trackingStatus?.message || 'Provider is on the way',
      timestamp: payload?.trackingStatus?.timestamp || new Date().toISOString(),
    },
    bookingId: payload?.bookingId || '',
  };
}
