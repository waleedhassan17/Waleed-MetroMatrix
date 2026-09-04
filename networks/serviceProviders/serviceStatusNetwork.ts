// ============================================
// SERVICE STATUS NETWORK APIs
// ============================================

import { ServiceStatus, ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchServiceStatus(
  bookingId: string
): Promise<ApiResponse<ServiceStatus>> {
    return apiRequest<ServiceStatus>(`/bookings/${bookingId}/service-status`);
}

/**
 * The customer confirms the job is done. Idempotent server-side, so a retry
 * after a dropped response is safe.
 */
export async function completeBookingByCustomer(
  bookingId: string
): Promise<ApiResponse<{ bookingId: string; status: string }>> {
    return apiRequest(`/bookings/${bookingId}/complete`, {
    method: 'POST',
  });
}
