// ============================================
// Home Services — customer extras API (HS8): disputes raised by customers,
// booking detail, notifications and saved addresses.
// The admin endpoints moved to networks/admin/homeServicesApi.ts (typed
// against the admin contract).
// ============================================

import { ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

// ---- Customer extras (HS8) ----

export async function raiseDispute(
  bookingId: string,
  data: { reason: string; description?: string; evidence?: string[] }
): Promise<ApiResponse<{ disputeId: string; status: string }>> {
  return apiRequest(`/bookings/${bookingId}/dispute`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchBookingDetail(bookingId: string): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/bookings/${bookingId}`);
}

export interface HSNotification {
  id: string;
  bookingId: string;
  type: string;
  title: string;
  body: string;
  at: string;
}

export async function fetchHSNotifications(): Promise<ApiResponse<HSNotification[]>> {
  return apiRequest<HSNotification[]>('/user/notifications');
}

export interface UserAddressFull {
  id: string;
  label: string;
  address: string;
  city: string;
  isDefault: boolean;
  icon?: string;
  coordinates?: { latitude: number; longitude: number };
}

export async function fetchUserAddresses(): Promise<ApiResponse<UserAddressFull[]>> {
  return apiRequest<UserAddressFull[]>('/user/addresses');
}

export async function updateUserAddressApi(
  id: string,
  data: Partial<UserAddressFull>
): Promise<ApiResponse<UserAddressFull>> {
  return apiRequest(`/user/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
