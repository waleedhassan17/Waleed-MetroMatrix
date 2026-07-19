import API from '../network/network';
import type {
  AdminAuthResponse,
  DashboardResponse,
  UserListResponse,
  ProviderListResponse,
  Provider,
  User,
  NotificationListResponse,
  AdminNotification,
  SettingsResponse,
  AppSettings,
  ActionResponse,
  ProviderType,
  VerificationStatus,
} from '../../models/admin';

// API Configuration - centralized base URL from network.ts (Vercel host)
export { API_URL } from '../network/network';
import { API_URL } from '../network/network';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getAuthHeader = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

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
    console.log('📤 Admin login request to:', `/admin/auth/login`);
    const response = await API.POST({ URL: '/admin/auth/login', data: { email, password } });
    console.log('📥 Admin login response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Admin login failed');
  }
};

export const adminLogoutAPI = async (token: string): Promise<ActionResponse> => {
  try {
    console.log('📤 Admin logout request');
    const response = await API.POST({ URL: '/admin/auth/logout', data: {}, headers: getAuthHeader(token).headers });
    console.log('📥 Admin logout response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Admin logout failed');
  }
};

export const refreshAdminTokenAPI = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    console.log('📤 Refreshing admin token');
    const response = await API.POST({ URL: '/admin/auth/refresh-token', data: { refreshToken } });
    console.log('📥 Token refresh response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Token refresh failed');
  }
};

export const getAdminProfileAPI = async (token: string) => {
  try {
    console.log('📤 Fetching admin profile');
    const response = await API.GET({ URL: '/admin/profile', headers: getAuthHeader(token).headers });
    console.log('📥 Admin profile response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch admin profile');
  }
};

// ============================================
// 2. DASHBOARD APIS
// ============================================

export const getDashboardStatsAPI = async (token: string): Promise<DashboardResponse> => {
  try {
    console.log('📤 Fetching dashboard stats');
    const response = await API.GET({ URL: '/admin/dashboard/stats', headers: getAuthHeader(token).headers });
    console.log('📥 Dashboard stats response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch dashboard stats');
  }
};

export const getRecentRegistrationsAPI = async (
  token: string,
  limit: number = 10
) => {
  try {
    console.log('📤 Fetching recent registrations');
    const response = await API.GET({
      URL: `/admin/dashboard/recent-registrations`,
      params: { limit },
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Recent registrations response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch recent registrations');
  }
};

export const getQuickStatsAPI = async (token: string) => {
  try {
    console.log('📤 Fetching quick stats');
    const response = await API.GET({
      URL: '/admin/dashboard/quick-stats',
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Quick stats response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch quick stats');
  }
};

// ============================================
// 3. USER MANAGEMENT APIS
// ============================================

export const getAllUsersAPI = async (
  token: string,
  page: number = 1,
  limit: number = 15,
  search?: string,
  isActive?: boolean
): Promise<UserListResponse> => {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (isActive !== undefined) params.isActive = isActive;
    
    console.log('📤 Fetching all users with params:', params);
    const response = await API.GET({
      URL: '/admin/users',
      params,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 All users response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch users');
  }
};

export const getUserDetailsAPI = async (
  token: string, 
  userId: string
): Promise<{ success: boolean; user: User }> => {
  try {
    console.log('📤 Fetching user details for:', userId);
    const response = await API.GET({
      URL: `/admin/users/${userId}`,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 User details response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch user details');
  }
};

export const deactivateUserAPI = async (
  token: string, 
  userId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Deactivating user:', userId);
    const response = await API.PUT({
      URL: `/admin/users/${userId}/deactivate`,
      data: {},
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Deactivate user response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to deactivate user');
  }
};

export const activateUserAPI = async (
  token: string, 
  userId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Activating user:', userId);
    const response = await API.PUT({
      URL: `/admin/users/${userId}/activate`,
      data: {},
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Activate user response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to activate user');
  }
};

export const deleteUserAPI = async (
  token: string, 
  userId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Deleting user:', userId);
    const response = await API.DELETE({
      URL: `/admin/users/${userId}`,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Delete user response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete user');
  }
};

// ============================================
// 4. PROVIDER MANAGEMENT APIS
// ============================================

export const getAllProvidersAPI = async (
  token: string,
  page: number = 1,
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
    
    console.log('📤 Fetching all providers with params:', params);
    const response = await API.GET({
      URL: '/admin/providers',
      params,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 All providers response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch providers');
  }
};

export const getProvidersByTypeAPI = async (
  token: string,
  providerType: ProviderType,
  page: number = 1,
  limit: number = 15,
  status?: VerificationStatus,
  search?: string
): Promise<ProviderListResponse> => {
  try {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    
    console.log(`📤 Fetching ${providerType} providers with params:`, params);
    const response = await API.GET({
      URL: `/admin/providers/${providerType}`,
      params,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Providers by type response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, `Failed to fetch ${providerType} providers`);
  }
};

export const getPendingProvidersAPI = async (
  token: string,
  page: number = 1,
  limit: number = 15,
  providerType?: ProviderType
): Promise<ProviderListResponse> => {
  try {
    const params: any = { page, limit };
    if (providerType) params.providerType = providerType;
    
    console.log('📤 Fetching pending providers with params:', params);
    const response = await API.GET({
      URL: '/admin/providers/pending',
      params,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Pending providers response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch pending providers');
  }
};

export const getProviderDetailsAPI = async (
  token: string, 
  providerId: string
): Promise<{ success: boolean; provider: Provider }> => {
  try {
    console.log('📤 Fetching provider details for:', providerId);
    const response = await API.GET({
      URL: `/admin/providers/${providerId}`,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Provider details response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch provider details');
  }
};

export const approveProviderAPI = async (
  token: string, 
  providerId: string,
  adminNotes?: string
): Promise<ActionResponse & { provider?: Provider; data?: any }> => {
  try {
    console.log('📤 Approving provider:', providerId);
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/approve`,
      data: { adminNotes },
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Approve provider response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to approve provider');
  }
};

export const rejectProviderAPI = async (
  token: string, 
  providerId: string, 
  reason: string,
  adminNotes?: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Rejecting provider:', providerId, 'Reason:', reason);
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/reject`,
      data: { reason },
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Reject provider response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to reject provider');
  }
};

export const deactivateProviderAPI = async (
  token: string, 
  providerId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Deactivating provider:', providerId);
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/deactivate`,
      data: {},
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Deactivate provider response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to deactivate provider');
  }
};

export const activateProviderAPI = async (
  token: string, 
  providerId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Activating provider:', providerId);
    const response = await API.PUT({
      URL: `/admin/providers/${providerId}/activate`,
      data: {},
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Activate provider response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to activate provider');
  }
};

export const deleteProviderAPI = async (
  token: string, 
  providerId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Deleting provider:', providerId);
    const response = await API.DELETE({
      URL: `/admin/providers/${providerId}`,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Delete provider response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete provider');
  }
};

// ============================================
// 5. NOTIFICATION APIS
// ============================================

export const getNotificationsAPI = async (
  token: string,
  page: number = 1,
  limit: number = 20,
  isRead?: boolean
): Promise<NotificationListResponse> => {
  try {
    const params: any = { page, limit };
    if (isRead !== undefined) params.isRead = isRead;
    
    console.log('📤 Fetching notifications with params:', params);
    const response = await API.GET({
      URL: '/admin/notifications',
      params,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Notifications response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch notifications');
  }
};

export const getUnreadCountAPI = async (
  token: string
): Promise<{ success: boolean; unreadCount: number }> => {
  try {
    console.log('📤 Fetching unread notification count');
    const response = await API.GET({
      URL: '/admin/notifications/unread-count',
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Unread count response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch unread count');
  }
};

export const markNotificationReadAPI = async (
  token: string, 
  notificationId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Marking notification as read:', notificationId);
    const response = await API.PUT({
      URL: `/admin/notifications/${notificationId}/read`,
      data: {},
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Mark read response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to mark notification as read');
  }
};

export const markAllNotificationsReadAPI = async (
  token: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Marking all notifications as read');
    const response = await API.PUT({
      URL: '/admin/notifications/read-all',
      data: {},
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Mark all read response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to mark all notifications as read');
  }
};

export const deleteNotificationAPI = async (
  token: string, 
  notificationId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Deleting notification:', notificationId);
    const response = await API.DELETE({
      URL: `/admin/notifications/${notificationId}`,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Delete notification response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete notification');
  }
};

export const clearAllNotificationsAPI = async (
  token: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Clearing all notifications');
    const response = await API.DELETE({
      URL: '/admin/notifications/clear-all',
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Clear all response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to clear all notifications');
  }
};

// ============================================
// 6. SETTINGS APIS
// ============================================

export const getSettingsAPI = async (token: string): Promise<SettingsResponse> => {
  try {
    console.log('📤 Fetching settings');
    const response = await API.GET({
      URL: '/admin/settings',
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Settings response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch settings');
  }
};

export const updateSettingsAPI = async (
  token: string,
  section: keyof AppSettings,
  settings: Partial<AppSettings[keyof AppSettings]>
): Promise<SettingsResponse> => {
  try {
    console.log('📤 Updating settings section:', section);
    const response = await API.PUT({
      URL: `/admin/settings/${section}`,
      data: settings,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Update settings response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to update settings');
  }
};

export const updateAdminProfileAPI = async (
  token: string,
  data: { fullName?: string; email?: string; avatar?: string }
): Promise<ActionResponse> => {
  try {
    console.log('📤 Updating admin profile');
    const response = await API.PUT({
      URL: '/admin/profile',
      data,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Update profile response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to update admin profile');
  }
};

export const changeAdminPasswordAPI = async (
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Changing admin password');
    const response = await API.PUT({
      URL: '/admin/change-password',
      data: { currentPassword, newPassword },
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Change password response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to change password');
  }
};

// ============================================
// 7. POST MANAGEMENT APIS
// ============================================

export const deletePostAPI = async (
  token: string, 
  postId: string
): Promise<ActionResponse> => {
  try {
    console.log('📤 Deleting post:', postId);
    const response = await API.DELETE({
      URL: `/admin/posts/${postId}`,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Delete post response:', response.data);
    return response.data;
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete post');
  }
};

// ============================================
// 8. ANALYTICS APIS
// ============================================

export const getAnalyticsAPI = async (
  token: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    console.log('📤 Fetching analytics with params:', params);
    const response = await API.GET({
      URL: '/admin/analytics',
      params,
      headers: getAuthHeader(token).headers
    });
    console.log('📥 Analytics response:', response.data);
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
