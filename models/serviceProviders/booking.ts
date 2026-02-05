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
  category: 'electricians' | 'plumbers' | 'ac-repairers';
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

export interface BookingConfirmation {
  bookingId: string;
  status: 'waiting' | 'confirmed' | 'rejected' | 'cancelled';
  provider: BookingProvider;
  bookingDetails: BookingDetails;
  estimatedArrival?: string;
}
