// ============================================================================
// Home-service notifications — the SAME endpoints for the customer and the
// provider. The server resolves the caller from their token and scopes every
// query to them, so there is no role parameter here and nothing to pass wrong.
//
// Deliberately NOT importing from networks/healthcare/providerApi, whose
// similarly-named functions look reusable but route through a different axios
// instance and prefix /api/v1/healthcare.
// ============================================================================

import { apiRequest } from './config';
import { ApiResponse } from '../../models/serviceProviders';

export type HSNotificationType =
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_en_route'
  | 'booking_arrived'
  | 'booking_in_progress'
  | 'booking_completed'
  | 'message'
  | 'missed_call'
  | 'payment_requested'
  | 'payment_received';

export interface HSNotification {
  id: string;
  title: string;
  message: string;
  type: HSNotificationType;
  isRead: boolean;
  createdAt: string;
  /** Routing payload — carries bookingId for the tap target. */
  data?: { bookingId?: string; roomType?: string; status?: string } | null;
}

export interface HSNotificationsPage {
  notifications: HSNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function fetchNotifications(
  page = 1,
  limit = 30
): Promise<ApiResponse<HSNotificationsPage>> {
  return apiRequest<HSNotificationsPage>(`/notifications?page=${page}&limit=${limit}`);
}

export async function fetchUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
  return apiRequest<{ unreadCount: number }>('/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<ApiResponse<HSNotification>> {
  return apiRequest<HSNotification>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<
  ApiResponse<{ updatedCount: number }>
> {
  return apiRequest<{ updatedCount: number }>('/notifications/read-all', { method: 'PATCH' });
}
