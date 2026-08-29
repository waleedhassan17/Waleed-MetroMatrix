// ============================================
// BOOKING SERIALIZERS
// ============================================

import {
  SavedAddress,
  TimeSlot,
  BookingProvider,
  Booking,
  BookingConfirmation,
} from '../../models/serviceProviders';

export function savedAddressSerializer(data: any): SavedAddress {
  return {
    id: data?.id || '',
    label: data?.label || '',
    address: data?.address || '',
    icon: data?.icon || 'location',
    isDefault: data?.isDefault ?? false,
    coordinates: {
      latitude: data?.coordinates?.latitude || 0,
      longitude: data?.coordinates?.longitude || 0,
    },
  };
}

export function timeSlotSerializer(data: any): TimeSlot {
  return {
    id: data?.id || '',
    time: data?.time || '',
    available: data?.available ?? true,
    period: data?.period || 'morning',
  };
}

export function bookingProviderSerializer(data: any): BookingProvider {
  return {
    id: data?.id || '',
    name: data?.name || '',
    image: data?.image || '',
    service: data?.service || '',
    specialty: data?.specialty || '',
    rating: data?.rating || 0,
    reviews: data?.reviews || 0,
    experience: data?.experience || '',
    verified: data?.verified ?? false,
    isOnline: data?.isOnline ?? false,
    responseTime: data?.responseTime || '',
    basePrice: data?.basePrice || data?.price || 0,
    category: data?.category || 'electricians',
  };
}

export function bookingDataSerializer(payload: any): {
  provider: BookingProvider;
  addresses: SavedAddress[];
  timeSlots: TimeSlot[];
} {
  return {
    provider: bookingProviderSerializer(payload?.provider || {}),
    addresses: (payload?.savedAddresses || payload?.addresses || []).map(savedAddressSerializer),
    timeSlots: (payload?.timeSlots || []).map(timeSlotSerializer),
  };
}

// A FABRICATED BOOKING ID IS WORSE THAN NO BOOKING ID.
//
// These two fields used to fall back to `BK-${Date.now()}`. That id addresses
// nothing: it is not a booking the server knows about, so chat and calling —
// which key their room off it — fail with "Not a participant", a long way from
// the response that was actually malformed. Empty string is the honest answer,
// and every consumer already handles it (ChatScreen and CallScreen both show a
// "this opens with your booking" state rather than dead-ending).
export function bookingSerializer(data: any): Booking {
  return {
    id: data?.id || '',
    bookingId: data?.bookingId || '',
    status: data?.status || 'pending',
    provider: bookingProviderSerializer(data?.provider || {}),
    selectedDate: data?.selectedDate || '',
    selectedTime: data?.selectedTime || '',
    address: savedAddressSerializer(data?.address || {}),
    instructions: data?.instructions || '',
    estimatedPrice: data?.estimatedPrice || 0,
    createdAt: data?.createdAt || new Date().toISOString(),
    confirmedAt: data?.confirmedAt,
    startedAt: data?.startedAt,
    completedAt: data?.completedAt,
  };
}

export function bookingConfirmationSerializer(payload: any): BookingConfirmation {
  return {
    bookingId: payload?.bookingId || '',
    status: payload?.status || 'waiting',
    provider: bookingProviderSerializer(payload?.provider || {}),
    bookingDetails: {
      providerId: payload?.bookingDetails?.providerId || '',
      providerName: payload?.bookingDetails?.providerName || '',
      service: payload?.bookingDetails?.service || '',
      selectedDate: payload?.bookingDetails?.selectedDate || '',
      selectedTime: payload?.bookingDetails?.selectedTime || '',
      selectedAddress: payload?.bookingDetails?.selectedAddress 
        ? savedAddressSerializer(payload.bookingDetails.selectedAddress) 
        : null,
      instructions: payload?.bookingDetails?.instructions || '',
      estimatedPrice: payload?.bookingDetails?.estimatedPrice || 0,
      estimatedDuration: payload?.bookingDetails?.estimatedDuration || '',
    },
    estimatedArrival: payload?.estimatedArrival,
  };
}
