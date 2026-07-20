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
