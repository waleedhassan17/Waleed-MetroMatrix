// ============================================
// Shopping notifications — the order inbox for customers AND vendors.
// The server scopes every call to whoever is signed in (customer → User,
// vendor → the brand owner's Provider), so one API serves both sides.
// ============================================

import ShoppingAxiosInstance, { extractShoppingError } from './shoppingAxios';

export interface ShoppingNotification {
  id: string;
  type: 'order_placed' | 'order_created' | 'order_update' | 'order_cancelled' | 'return_requested' | 'product_moderation';
  title: string;
  message: string;
  data: { orderId?: string; odexId?: string; status?: string; returnId?: string; productId?: string } | null;
  isRead: boolean;
  createdAt: string;
}

export const fetchShoppingNotificationsApi = async (page = 1, limit = 30): Promise<ShoppingNotification[]> => {
  try {
    const res = await ShoppingAxiosInstance.get('/notifications', { params: { page, limit } });
    return res.data?.data || [];
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to load notifications'));
  }
};

export const fetchShoppingUnreadCountApi = async (): Promise<number> => {
  try {
    const res = await ShoppingAxiosInstance.get('/notifications/unread-count');
    return Number(res.data?.data?.count) || 0;
  } catch {
    return 0; // a badge is never worth an error
  }
};

export const markShoppingNotificationReadApi = async (id: string): Promise<void> => {
  try {
    await ShoppingAxiosInstance.patch(`/notifications/${id}/read`);
  } catch {
    // best-effort; the next fetch re-syncs
  }
};

export const markAllShoppingNotificationsReadApi = async (): Promise<void> => {
  try {
    await ShoppingAxiosInstance.patch('/notifications/read-all');
  } catch (e) {
    throw new Error(extractShoppingError(e, 'Failed to mark notifications read'));
  }
};
