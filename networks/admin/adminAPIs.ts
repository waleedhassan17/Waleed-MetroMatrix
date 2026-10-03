import API from '../network/network';
import type {
  AdminAuthResponse,
  DashboardResponse,
  UserListResponse,
  ProviderListResponse,
  Provider,
  User,
  NotificationListResponse,
  SettingsResponse,
  AppSettings,
  ActionResponse,
  ProviderType,
  VerificationStatus,
} from '../../models/admin';

// API Configuration - centralized base URL from network.ts (Vercel host)
export { API_URL } from '../network/network';

// ============================================
// HELPER FUNCTIONS
// ============================================

const handleApiError = (error: any, defaultMessage: string) => {
  console.error(`❌ ${defaultMessage}:`, error.response?.data || error.message);
  throw new Error(
    error.response?.data?.error || 
    error.response?.data?.message || 
    defaultMessage
  );
};

// ============================================
// 1. AUTHENTICATION APIS
// ============================================

export const adminLoginAPI = async (
  email: string, 
  password: string
): Promise<AdminAuthResponse> => {
  try {
    const response = await API.POST({ URL: '/admin/auth/login', data: { email, password } });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Admin login failed');
  }
};

export const adminLogoutAPI = async (): Promise<ActionResponse> => {
  try {
    const response = await API.POST({ URL: '/admin/auth/logout', data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Admin logout failed');
  }
};

export const refreshAdminTokenAPI = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const response = await API.POST({ URL: '/admin/auth/refresh-token', data: { refreshToken } });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Token refresh failed');
  }
};

export const getAdminProfileAPI = async () => {
  try {
    const response = await API.GET({ URL: '/admin/profile' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch admin profile');
  }
};

// ============================================
// 2. DASHBOARD APIS
// ============================================

export const getDashboardStatsAPI = async (): Promise<DashboardResponse> => {
  try {
    const response = await API.GET({ URL: '/admin/dashboard/stats' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch dashboard stats');
  }
};

export const getRecentRegistrationsAPI = async (limit: number = 10
) => {
  try {
    const response = await API.GET({
      URL: `/admin/dashboard/recent-registrations`,
      params: { limit } });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch recent registrations');
  }
};

export const getQuickStatsAPI = async () => {
  try {
    const response = await API.GET({
      URL: '/admin/dashboard/quick-stats' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch quick stats');
  }
};

// ============================================
// 3. USER MANAGEMENT APIS
// ============================================

export const getAllUsersAPI = async (page: number = 1,
  limit: number = 15,
  search?: string,
  isActive?: boolean
): Promise<UserListResponse> => {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (isActive !== undefined) params.isActive = isActive;
    const response = await API.GET({
      URL: '/admin/users',
      params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch users');
  }
};

export const getUserDetailsAPI = async (userId: string
): Promise<{ success: boolean; user: User }> => {
  try {
    const response = await API.GET({
      URL: `/admin/users/${userId}` });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch user details');
  }
};

export const deactivateUserAPI = async (userId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/users/${userId}/deactivate`,
      data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to deactivate user');
  }
};

export const activateUserAPI = async (userId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/users/${userId}/activate`,
      data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to activate user');
  }
};

export const deleteUserAPI = async (userId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.DELETE({
      URL: `/admin/users/${userId}` });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete user');
  }
};

// ============================================
// 4. PROVIDER MANAGEMENT APIS
// ============================================

export const getAllProvidersAPI = async (page: number = 1,
  limit: number = 15,
  status?: VerificationStatus | 'all',
  providerType?: ProviderType | 'all',
  search?: string,
  isActive?: boolean
): Promise<ProviderListResponse> => {
  try {
    const params: any = { page, limit };
    if (status && status !== 'all') params.status = status;
    if (providerType && providerType !== 'all') params.providerType = providerType;
    if (search) params.search = search;
    if (isActive !== undefined) params.isActive = isActive;
    const response = await API.GET({
      URL: '/admin/providers',
      params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch providers');
  }
};

export const getProvidersByTypeAPI = async (providerType: ProviderType,
  page: number = 1,
  limit: number = 15,
  status?: VerificationStatus,
  search?: string
): Promise<ProviderListResponse> => {
  try {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await API.GET({
      URL: `/admin/providers/${providerType}`,
      params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, `Failed to fetch ${providerType} providers`);
  }
};

export const getPendingProvidersAPI = async (page: number = 1,
  limit: number = 15,
  providerType?: ProviderType
): Promise<ProviderListResponse> => {
  try {
    const params: any = { page, limit };
    if (providerType) params.providerType = providerType;
    const response = await API.GET({
      URL: '/admin/providers/pending',
      params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch pending providers');
  }
};

export const getProviderDetailsAPI = async (providerId: string
): Promise<{ success: boolean; provider: Provider }> => {
  try {
    const response = await API.GET({
      URL: `/admin/providers/${providerId}` });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch provider details');
  }
};

export const approveProviderAPI = async (providerId: string,
  adminNotes?: string
): Promise<ActionResponse & { provider?: Provider; data?: any }> => {
  try {
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/approve`,
      data: { adminNotes } });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to approve provider');
  }
};

export const rejectProviderAPI = async (providerId: string, 
  reason: string,
  adminNotes?: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/reject`,
      data: { reason } });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to reject provider');
  }
};

export const deactivateProviderAPI = async (providerId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/deactivate`,
      data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to deactivate provider');
  }
};

export const activateProviderAPI = async (providerId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/activate`,
      data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to activate provider');
  }
};

export const deleteProviderAPI = async (providerId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.DELETE({
      URL: `/admin/providers/${providerId}` });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete provider');
  }
};

// ============================================
// 5. NOTIFICATION APIS
// ============================================

export const getNotificationsAPI = async (page: number = 1,
  limit: number = 20,
  isRead?: boolean
): Promise<NotificationListResponse> => {
  try {
    const params: any = { page, limit };
    if (isRead !== undefined) params.isRead = isRead;
    const response = await API.GET({
      URL: '/admin/notifications',
      params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch notifications');
  }
};

export const getUnreadCountAPI = async (): Promise<{ success: boolean; unreadCount: number }> => {
  try {
    const response = await API.GET({
      URL: '/admin/notifications/unread-count' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch unread count');
  }
};

export const markNotificationReadAPI = async (notificationId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/notifications/${notificationId}/read`,
      data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to mark notification as read');
  }
};

export const markAllNotificationsReadAPI = async (): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: '/admin/notifications/read-all',
      data: {} });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to mark all notifications as read');
  }
};

export const deleteNotificationAPI = async (notificationId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.DELETE({
      URL: `/admin/notifications/${notificationId}` });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete notification');
  }
};

export const clearAllNotificationsAPI = async (): Promise<ActionResponse> => {
  try {
    const response = await API.DELETE({
      URL: '/admin/notifications/clear-all' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to clear all notifications');
  }
};

// ============================================
// 6. SETTINGS APIS
// ============================================

export const getSettingsAPI = async (): Promise<SettingsResponse> => {
  try {
    const response = await API.GET({
      URL: '/admin/settings' });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch settings');
  }
};

export const updateSettingsAPI = async (section: keyof AppSettings,
  settings: Partial<AppSettings[keyof AppSettings]>
): Promise<SettingsResponse> => {
  try {
    const response = await API.PUT({
      URL: `/admin/settings/${section}`,
      data: settings });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to update settings');
  }
};

export const updateAdminProfileAPI = async (data: { fullName?: string; email?: string; avatar?: string }
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: '/admin/profile',
      data });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to update admin profile');
  }
};

export const changeAdminPasswordAPI = async (currentPassword: string,
  newPassword: string
): Promise<ActionResponse> => {
  try {
    const response = await API.PUT({
      URL: '/admin/change-password',
      data: { currentPassword, newPassword } });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to change password');
  }
};

// ============================================
// 7. POST MANAGEMENT APIS
// ============================================

export const deletePostAPI = async (postId: string
): Promise<ActionResponse> => {
  try {
    const response = await API.DELETE({
      URL: `/admin/posts/${postId}` });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete post');
  }
};

// ============================================
// 8. ANALYTICS APIS
// ============================================

export const getAnalyticsAPI = async (startDate?: string,
  endDate?: string
) => {
  try {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await API.GET({
      URL: '/admin/analytics',
      params });
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch analytics');
  }
};

export default {
  // Auth
  adminLoginAPI,
  adminLogoutAPI,
  refreshAdminTokenAPI,
  getAdminProfileAPI,
  
  // Dashboard
  getDashboardStatsAPI,
  getRecentRegistrationsAPI,
  getQuickStatsAPI,
  
  // Users
  getAllUsersAPI,
  getUserDetailsAPI,
  deactivateUserAPI,
  activateUserAPI,
  deleteUserAPI,
  
  // Providers
  getAllProvidersAPI,
  getProvidersByTypeAPI,
  getPendingProvidersAPI,
  getProviderDetailsAPI,
  approveProviderAPI,
  rejectProviderAPI,
  deactivateProviderAPI,
  activateProviderAPI,
  deleteProviderAPI,
  
  // Notifications
  getNotificationsAPI,
  getUnreadCountAPI,
  markNotificationReadAPI,
  markAllNotificationsReadAPI,
  deleteNotificationAPI,
  clearAllNotificationsAPI,
  
  // Settings
  getSettingsAPI,
  updateSettingsAPI,
  updateAdminProfileAPI,
  changeAdminPasswordAPI,
  
  // Posts
  deletePostAPI,
  
  // Analytics
  getAnalyticsAPI,
};
