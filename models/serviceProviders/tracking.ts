// ============================================
// TRACKING MODELS
// ============================================

import { Coordinates } from './provider';

export interface TrackingProvider {
  id: string;
  name: string;
  phone: string;
  image: string;
  service: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: string;
  verified: boolean;
  /** Undefined when the server could not resolve the provider's trade.
   *  Never guess a value here — see toServiceCategory(). */
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
}

export interface TrackingStatus {
  status: 'en_route' | 'nearby' | 'arrived' | 'in_progress' | 'completed';
  message: string;
  timestamp: string;
}

export interface RouteInfo {
  coordinates: Coordinates[];
  distance: string;
  distanceValue: number;
  duration: string;
  durationValue: number;
}

export interface TrackingData {
  provider: TrackingProvider;
  /** The LIVE position only — null until the provider's first location ping
   *  (the server never substitutes their stored service area). */
  providerLocation: Coordinates | null;
  userLocation: Coordinates | null;
  route: RouteInfo | null;
  trackingStatus: TrackingStatus;
  bookingId: string;
}
