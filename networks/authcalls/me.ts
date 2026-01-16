import { UserInfo } from '../../models/user';
import { ProviderInfo } from '../../models/provider';

// Base API URL - update this with your actual API endpoint
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

/**
 * Fetch current user or provider information
 * @param userType - Type of user to fetch ('user' or 'provider')
 * @returns Promise with user or provider information
 */
export const me = async (userType: 'user' | 'provider' = 'user'): Promise<UserInfo | ProviderInfo> => {
  try {
    // Get token from storage
    const { getAccessToken } = await import('../../utils/storage_utils/storageUtils');
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Determine endpoint based on user type
    const endpoint = userType === 'provider' ? '/provider/me' : '/user/me';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        throw new Error('Authentication token expired');
      }
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user/provider data:', error);
    throw error;
  }
};

/**
 * Persist FCM token for push notifications
 * @param fcmToken - Firebase Cloud Messaging token
 * @param deviceType - Type of device (ios/android)
 * @returns Promise with success status
 */
export const persistFcmToken = async (
  fcmToken: string,
  deviceType: string
): Promise<{ success: boolean }> => {
  try {
    // Get token from storage
    const { getAccessToken } = await import('../../utils/storage_utils/storageUtils');
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/device/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcmToken,
        deviceType,
        deviceInfo: {
          platform: deviceType,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to persist FCM token: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error persisting FCM token:', error);
    throw error;
  }
};

/**
 * Refresh authentication token
 * @returns Promise with new access token
 */
export const refreshAuthToken = async (): Promise<{ accessToken: string; refreshToken?: string }> => {
  try {
    const { getRefreshToken } = await import('../../utils/storage_utils/storageUtils');
    const refreshToken = await getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    
    // Save new tokens
    const { saveAuthTokens } = await import('../../utils/storage_utils/storageUtils');
    await saveAuthTokens(data.accessToken, data.refreshToken);
    
    return data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

/**
 * Logout user
 * @returns Promise with success status
 */
export const logoutApi = async (): Promise<{ success: boolean }> => {
  try {
    const { getAccessToken } = await import('../../utils/storage_utils/storageUtils');
    const token = await getAccessToken();
    
    if (token) {
      // Call logout endpoint if available
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => {
        // Ignore errors from logout endpoint
        console.log('Logout endpoint failed, continuing with local logout');
      });
    }
    
    // Clear local storage
    const { clearAuthData } = await import('../../utils/storage_utils/storageUtils');
    await clearAuthData();
    
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    // Still clear local data even if API call fails
    const { clearAuthData } = await import('../../utils/storage_utils/storageUtils');
    await clearAuthData();
    return { success: true };
  }
};