// ============================================
// SERVICE STATUS NETWORK APIs
// ============================================

import { ServiceStatus, ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchServiceStatus(
  bookingId: string
): Promise<ApiResponse<ServiceStatus>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: {
        bookingId,
        status: 'in_progress',
        provider: {
          id: '1',
          name: 'John Smith',
          phone: '+92 300 1234567',
          image: 'https://randomuser.me/api/portraits/men/1.jpg',
        },
        serviceDetails: {
          type: 'Electrical Repair',
          description: 'Fixing electrical wiring issues',
          startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
          estimatedDuration: '1-2 hours',
          suggestedAmount: 2500,
        },
        progressSteps: [
          { id: 1, label: 'Provider Arrived', completed: true, time: '10:30 AM' },
          { id: 2, label: 'Inspection', completed: true, time: '10:45 AM' },
          { id: 3, label: 'Work in Progress', completed: false },
          { id: 4, label: 'Quality Check', completed: false },
          { id: 5, label: 'Completed', completed: false },
        ],
      },
      message: 'Service status fetched',
    };
  }

  return apiRequest<ServiceStatus>(`/bookings/${bookingId}/service-status`);
}
