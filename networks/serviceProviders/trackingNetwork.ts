// ============================================
// TRACKING NETWORK APIs
// ============================================

import { TrackingData, ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchTrackingData(
  bookingId: string
): Promise<ApiResponse<TrackingData>> {
    return apiRequest<TrackingData>(`/bookings/${bookingId}/tracking`);
}

export async function updateProviderLocation(data: {
  latitude: number;
  longitude: number;
  jobId?: string;
}): Promise<ApiResponse<{ distance: string; duration: string }>> {
    return apiRequest('/provider/location', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markArrived(jobId: string): Promise<ApiResponse<{ arrived: boolean }>> {
    return apiRequest(`/provider/jobs/${jobId}/arrived`, {
    method: 'POST',
  });
}

export interface NavigationParams {
  jobId: string;
  destination: { latitude: number; longitude: number };
  destinationAddress: string;
  destinationCity: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
}

export async function fetchNavigationData(jobId: string): Promise<ApiResponse<NavigationParams>> {
    return apiRequest<NavigationParams>(`/provider/jobs/${jobId}/navigation`);
}
