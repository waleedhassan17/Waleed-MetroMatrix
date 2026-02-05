// ============================================
// TRACKING SERIALIZERS
// ============================================

import {
  TrackingProvider,
  TrackingData,
  RouteInfo,
  Coordinates,
} from '../../models/serviceProviders';

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
    category: data?.category || 'electricians',
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

export function trackingDataSerializer(payload: any): TrackingData {
  return {
    provider: trackingProviderSerializer(payload?.provider || {}),
    providerLocation: {
      latitude: payload?.providerLocation?.latitude || 0,
      longitude: payload?.providerLocation?.longitude || 0,
    },
    userLocation: payload?.userLocation ? {
      latitude: payload.userLocation.latitude || 0,
      longitude: payload.userLocation.longitude || 0,
    } : null,
    route: payload?.route ? routeInfoSerializer(payload.route) : null,
    trackingStatus: {
      status: payload?.trackingStatus?.status || payload?.status || 'en_route',
      message: payload?.trackingStatus?.message || 'Provider is on the way',
      timestamp: payload?.trackingStatus?.timestamp || new Date().toISOString(),
    },
    bookingId: payload?.bookingId || '',
  };
}
