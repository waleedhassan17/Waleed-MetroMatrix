// ============================================
// BOOKING NETWORK APIs
// ============================================

import {
  BookingProvider,
  BookingConfirmation,
  SavedAddress,
  TimeSlot,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';
import { DUMMY_PROVIDERS, DUMMY_SAVED_ADDRESSES, DUMMY_TIME_SLOTS } from './dummyData';

export async function fetchBookingData(providerId: string): Promise<
  ApiResponse<{
    provider: BookingProvider;
    addresses: SavedAddress[];
    timeSlots: TimeSlot[];
  }>
> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    const provider = DUMMY_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return { success: false, data: null as any, message: 'Provider not found' };
    }

    return {
      success: true,
      data: {
        provider: {
          id: provider.id,
          name: provider.name,
          image: provider.image,
          service: provider.specialty,
          specialty: provider.specialty,
          rating: provider.rating,
          reviews: provider.reviews,
          experience: provider.experience,
          verified: provider.verified,
          isOnline: provider.isOnline,
          responseTime: provider.responseTime,
          basePrice: provider.price,
          category: provider.category,
        },
        addresses: DUMMY_SAVED_ADDRESSES,
        timeSlots: DUMMY_TIME_SLOTS,
      },
      message: 'Booking data fetched',
    };
  }

  return apiRequest(`/bookings/init/${providerId}`);
}

export async function createBooking(data: {
  providerId: string;
  selectedDate: string;
  selectedTime: string;
  addressId: string;
  instructions?: string;
}): Promise<ApiResponse<BookingConfirmation>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const provider = DUMMY_PROVIDERS.find((p) => p.id === data.providerId);
    const address = DUMMY_SAVED_ADDRESSES.find((a) => a.id === data.addressId);

    return {
      success: true,
      data: {
        bookingId: `BK-${Date.now()}`,
        status: 'waiting',
        provider: {
          id: provider?.id || '',
          name: provider?.name || '',
          image: provider?.image || '',
          service: provider?.specialty || '',
          specialty: provider?.specialty || '',
          rating: provider?.rating || 0,
          reviews: provider?.reviews || 0,
          experience: provider?.experience || '',
          verified: provider?.verified || false,
          isOnline: provider?.isOnline || false,
          responseTime: provider?.responseTime || '',
          basePrice: provider?.price || 0,
          category: provider?.category || 'electricians',
        },
        bookingDetails: {
          providerId: data.providerId,
          providerName: provider?.name || '',
          service: provider?.specialty || '',
          selectedDate: data.selectedDate,
          selectedTime: data.selectedTime,
          selectedAddress: address || null,
          instructions: data.instructions || '',
          estimatedPrice: provider?.price || 0,
          estimatedDuration: '1-2 hours',
        },
        estimatedArrival: '15-20 minutes',
      },
      message: 'Booking created successfully',
    };
  }

  return apiRequest<BookingConfirmation>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data: { success: true }, message: 'Booking cancelled' };
  }

  return apiRequest(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
