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
import { apiRequest } from './config';

export async function fetchBookingData(providerId: string): Promise<
  ApiResponse<{
    provider: BookingProvider;
    addresses: SavedAddress[];
    timeSlots: TimeSlot[];
  }>
> {
    return apiRequest(`/bookings/init/${providerId}`);
}

export async function createBooking(data: {
  providerId: string;
  selectedDate: string;
  selectedTime: string;
  addressId: string;
  instructions?: string;
}): Promise<ApiResponse<BookingConfirmation>> {
    return apiRequest<BookingConfirmation>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
