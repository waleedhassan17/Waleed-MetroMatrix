// ============================================
// BOOKING NETWORK APIs
// ============================================

import {
  ActiveBooking,
  BookingProvider,
  BookingConfirmation,
  SavedAddress,
  TimeSlot,
  ApiResponse,
} from '../../models/serviceProviders';
import { apiRequest } from './config';

/**
 * @param date `YYYY-MM-DD`, once the customer has picked one. Time slots come
 * back generic (all available) without it; with it, any slot this provider
 * already has a live booking against on that date comes back unavailable.
 */
export async function fetchBookingData(providerId: string, date?: string): Promise<
  ApiResponse<{
    provider: BookingProvider;
    addresses: SavedAddress[];
    timeSlots: TimeSlot[];
    // Non-null when the customer already has a live request with this
    // provider; the booking form redirects to it rather than collecting a
    // date and address for a booking the server will refuse.
    activeBooking: ActiveBooking | null;
  }>
> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiRequest(`/bookings/init/${providerId}${qs}`);
}

/**
 * Every booking this customer still has running, across all providers.
 *
 * Read by the provider list and the provider profile so a provider who already
 * has the customer's request offers "View request" instead of a Book button
 * that leads to a 409.
 */
export async function fetchActiveBookings(): Promise<
  ApiResponse<{ bookings: ActiveBooking[] }>
> {
    // bestEffort: the answer only chooses a button label, and the caller
    // already treats failure as "no active requests". A backend deployed
    // before this route existed answers 404 — a deployment fact, not something
    // to raise a red error box over.
    return apiRequest('/bookings/active', { bestEffort: true });
}

/**
 * Create a booking.
 *
 * Fails with 409 and `data.activeBooking` when the customer already has a live
 * request with this provider — the server's duplicate guard. Callers should
 * open that booking rather than surfacing the message as an error; see
 * submitBooking in bookingScreenSlice.
 */
export async function createBooking(data: {
  providerId: string;
  selectedDate: string;
  selectedTime: string;
  addressId: string;
  instructions?: string;
}): Promise<ApiResponse<BookingConfirmation & { activeBooking?: ActiveBooking }>> {
    return apiRequest<BookingConfirmation & { activeBooking?: ActiveBooking }>('/bookings', {
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
