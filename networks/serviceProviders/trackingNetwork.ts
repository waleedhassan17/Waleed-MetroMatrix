// ============================================
// TRACKING NETWORK APIs
// ============================================

import { TrackingData, ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchTrackingData(
  bookingId: string
): Promise<ApiResponse<TrackingData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        provider: {
          id: '1',
          name: 'John Smith',
          phone: '+92 300 1234567',
          image: 'https://randomuser.me/api/portraits/men/1.jpg',
          service: 'Electrical Services',
          specialty: 'Wiring & Installations',
          rating: 4.9,
          reviews: 156,
          experience: '8 years',
          verified: true,
          category: 'electricians',
        },
        providerLocation: { latitude: 31.5250, longitude: 74.3550 },
        userLocation: { latitude: 31.5204, longitude: 74.3587 },
        route: {
          coordinates: [
            { latitude: 31.5250, longitude: 74.3550 },
            { latitude: 31.5230, longitude: 74.3560 },
            { latitude: 31.5210, longitude: 74.3575 },
            { latitude: 31.5204, longitude: 74.3587 },
          ],
          distance: '2.5 km',
          distanceValue: 2500,
          duration: '8 mins',
          durationValue: 480,
        },
        trackingStatus: {
          status: 'en_route',
          message: 'Provider is on the way',
          timestamp: new Date().toISOString(),
        },
        bookingId,
      },
      message: 'Tracking data fetched',
    };
  }

  return apiRequest<TrackingData>(`/bookings/${bookingId}/tracking`);
}

export async function updateProviderLocation(data: {
  latitude: number;
  longitude: number;
  jobId?: string;
}): Promise<ApiResponse<{ distance: string; duration: string }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
      data: {
        distance: '2.5 km',
        duration: '8 mins',
      },
      message: 'Location updated',
    };
  }

  return apiRequest('/provider/location', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markArrived(jobId: string): Promise<ApiResponse<{ arrived: boolean }>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: { arrived: true },
      message: 'Marked as arrived',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        jobId,
        destination: { latitude: 31.4504, longitude: 73.1350 },
        destinationAddress: '123 Main Street, Gulberg III',
        destinationCity: 'Lahore',
        customerName: 'Ali Ahmed',
        customerPhone: '+92 300 1234567',
        serviceType: 'Electrical Repair',
      },
      message: 'Navigation data fetched',
    };
  }

  return apiRequest<NavigationParams>(`/provider/jobs/${jobId}/navigation`);
}
