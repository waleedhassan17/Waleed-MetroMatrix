// ============================================
// Home Services — admin oversight + customer extras API (HS8)
// All calls ride apiRequest (shared authenticated axios). Admin endpoints
// live under /api/admin/*; see backend modules/homeservice/routes/adminRoutes.
// ============================================

import { ApiResponse, Pagination } from '../../models/serviceProviders';
import { apiRequest } from './config';

// ---- Admin: bookings ----

export interface AdminBookingRow {
  id: string;
  status: string;
  serviceCategory: string;
  serviceType: string;
  customer: { id: string; name: string; email: string } | null;
  provider: { id: string; name: string; email: string } | null;
  scheduledFor: string | null;
  price: number;
  paymentStatus: string;
  city: string;
  createdAt: string;
}

export async function fetchAdminBookings(params: {
  status?: string;
  serviceCategory?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<AdminBookingRow[]>> {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') qp.set(k, String(v));
  });
  return apiRequest<AdminBookingRow[]>(`/admin/bookings?${qp}`);
}

export async function fetchAdminBookingDetail(id: string): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/admin/bookings/${id}`);
}

export async function forceBookingStatus(
  id: string,
  status: string,
  reason: string
): Promise<ApiResponse<{ bookingId: string; status: string }>> {
  return apiRequest(`/admin/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export async function refundBooking(
  id: string,
  amount: number | undefined,
  reason: string
): Promise<ApiResponse<{ refunded: boolean; amount: number }>> {
  return apiRequest(`/admin/bookings/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}

// ---- Admin: disputes ----

export interface AdminDispute {
  id: string;
  bookingId: string | null;
  customer: string;
  provider: string;
  raisedByRole: string;
  againstRole: string;
  reason: string;
  description: string;
  evidence: string[];
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  resolution: string | null;
  refundAmount: number;
  createdAt: string;
}

export async function fetchAdminDisputes(params: {
  status?: string;
  page?: number;
}): Promise<ApiResponse<AdminDispute[]>> {
  const qp = new URLSearchParams();
  if (params.status && params.status !== 'all') qp.set('status', params.status);
  qp.set('page', String(params.page || 1));
  return apiRequest<AdminDispute[]>(`/admin/disputes?${qp}`);
}

export async function resolveAdminDispute(
  id: string,
  data: {
    status: string;
    resolution?: string;
    refundAmount?: number;
    penalizeProvider?: number;
    reason?: string;
  }
): Promise<ApiResponse<{ disputeId: string; status: string }>> {
  return apiRequest(`/admin/disputes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ---- Admin: payouts ----

export interface AdminPayoutRow {
  id: string;
  provider: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    completedJobs: number;
    rating: number;
    walletBalance: number;
  } | null;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
}

export async function fetchAdminPayouts(params: {
  status?: string;
}): Promise<ApiResponse<AdminPayoutRow[]>> {
  const qp = new URLSearchParams();
  if (params.status && params.status !== 'all') qp.set('status', params.status);
  return apiRequest<AdminPayoutRow[]>(`/admin/payout-requests?${qp}`);
}

export async function decideAdminPayout(
  id: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<ApiResponse<{ payoutId: string; status: string }>> {
  return apiRequest(`/admin/payout-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason }),
  });
}

// ---- Admin: service categories ----

export interface AdminServiceCategory {
  id: string;
  name: string;
  slug: string;
  providerSubType: string;
  icon: string;
  badge: string;
  badgeColor: string;
  image: string;
  description: string;
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
}

export async function fetchAdminCategories(): Promise<ApiResponse<AdminServiceCategory[]>> {
  return apiRequest<AdminServiceCategory[]>('/admin/service-categories');
}

export async function createAdminCategory(
  data: Partial<AdminServiceCategory>
): Promise<ApiResponse<AdminServiceCategory>> {
  return apiRequest('/admin/service-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminCategory(
  id: string,
  data: Partial<AdminServiceCategory>
): Promise<ApiResponse<AdminServiceCategory>> {
  return apiRequest(`/admin/service-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiRequest(`/admin/service-categories/${id}`, { method: 'DELETE' });
}

// ---- Admin: dashboard / analytics / settings ----

export async function fetchAdminHSDashboard(): Promise<ApiResponse<any>> {
  return apiRequest<any>('/admin/homeservice/dashboard');
}

export async function fetchAdminHSAnalytics(params: {
  from?: string;
  to?: string;
}): Promise<ApiResponse<any>> {
  const qp = new URLSearchParams();
  if (params.from) qp.set('from', params.from);
  if (params.to) qp.set('to', params.to);
  return apiRequest<any>(`/admin/homeservice/analytics?${qp}`);
}

export async function fetchAdminHSSettings(): Promise<ApiResponse<any>> {
  return apiRequest<any>('/admin/homeservice/settings');
}

export async function updateAdminHSSettings(data: any): Promise<ApiResponse<any>> {
  return apiRequest('/admin/homeservice/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

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
