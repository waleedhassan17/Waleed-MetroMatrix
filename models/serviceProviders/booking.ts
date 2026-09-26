// ============================================
// BOOKING MODELS
// ============================================

import { Coordinates } from './provider';

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  icon: 'home' | 'building' | 'location' | 'briefcase';
  isDefault: boolean;
  coordinates: Coordinates;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  period: 'morning' | 'afternoon' | 'evening';
  /** Why it cannot be booked, when it cannot: the server's own words. */
  reason?: 'day_off' | 'outside_hours' | 'past' | 'too_soon' | 'booked';
  reasonLabel?: string;
}

export interface BookingProvider {
  id: string;
  name: string;
  image: string;
  service: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: string;
  verified: boolean;
  isOnline: boolean;
  responseTime: string;
  basePrice: number;
  /** Undefined when the server could not resolve the provider's trade.
   *  Never guess a value here — see toServiceCategory(). */
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
}

export interface BookingDetails {
  providerId: string;
  providerName: string;
  service: string;
  selectedDate: string;
  selectedTime: string;
  selectedAddress: SavedAddress | null;
  instructions: string;
  estimatedPrice: number;
  estimatedDuration: string;
}

export interface Booking {
  id: string;
  bookingId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  provider: BookingProvider;
  selectedDate: string;
  selectedTime: string;
  address: SavedAddress;
  instructions: string;
  estimatedPrice: number;
  createdAt: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * A booking the customer still has running with a provider — anything not
 * completed, rejected or cancelled.
 *
 * The customer may hold one of these per provider and no more. Every Book
 * button reads this to decide between opening the booking form and reopening
 * the request that already exists, which is what stops the same provider being
 * booked twice over while the first request is still waiting.
 */
export interface ActiveBooking {
  bookingId: string;
  providerId: string;
  status: 'waiting' | 'confirmed' | 'rejected' | 'cancelled';
  category?: 'electricians' | 'plumbers' | 'ac-repairers';
  scheduledFor: string | null;
  scheduledTime: string;
  createdAt: string;
}

export interface BookingConfirmation {
  bookingId: string;
  status: 'waiting' | 'confirmed' | 'rejected' | 'cancelled';
  provider: BookingProvider;
  bookingDetails: BookingDetails;
  estimatedArrival?: string;
}
