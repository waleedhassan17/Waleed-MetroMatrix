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
  category: 'electricians' | 'plumbers' | 'ac-repairers';
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
  providerLocation: Coordinates;
  userLocation: Coordinates | null;
  route: RouteInfo | null;
  trackingStatus: TrackingStatus;
  bookingId: string;
}
