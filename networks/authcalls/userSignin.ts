import { API } from "../network/network";
import { retriveData, KeyForStorage } from "../../utils/storage_utils/storageUtils";
import { UserLoginData, UserAuthResponse } from "../../models/user";

/**
 * User Sign In (Login)
 * POST /auth/login
 */
export const authLogin = async ({ signInInfo }: { signInInfo: UserLoginData }) => {
  try {
    const { email, password } = signInInfo;

    console.log('📤 Attempting user login for:', email);

    const response = await API.POST({
      URL: "auth/login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
        password: password,
      },
    });

    console.log('✅ Login successful:', response.data);

    // Map API response to our UserAuthResponse format
    const authResponse: UserAuthResponse = {
      success: response.data.success,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };

    return authResponse;
  } catch (e: any) {
    console.error("❌ Login error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.response?.data?.error || 
                        e.message || 
                        "Invalid email or password";
    
    throw new Error(errorMessage);
  }
};

/**
 * User Logout
 * POST /auth/logout
 */
export const authLogout = async () => {
  try {
    const token = await retriveData(KeyForStorage.accessToken);

    console.log('📤 Attempting user logout');

    const response = await API.POST({
      URL: "auth/logout",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {},
    });

    console.log('✅ Logout successful');

    return response.data;
  } catch (e: any) {
    console.error("❌ Logout error:", e);
    // Even if logout fails on server, we should still clear local data
    return { success: false, message: e.message };
  }
};

/**
 * Refresh Access Token
 * POST /auth/refresh
 */
export const refreshAccessToken = async (refreshToken: string) => {
  try {
    console.log('📤 Refreshing access token');

    const response = await API.POST({
      URL: "auth/refresh",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    console.log('✅ Token refreshed successfully');

    return {
      success: response.data.success,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  } catch (e: any) {
    console.error("❌ Token refresh error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to refresh token";
    
    throw new Error(errorMessage);
  }
};

/**
 * Get Current User Profile
 * GET /users/profile
 */
export const getUserProfile = async () => {
  try {
    const token = await retriveData(KeyForStorage.accessToken);

    console.log('📤 Fetching user profile');

    const response = await API.GET({
      URL: "users/profile",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ User profile fetched successfully');

    return response.data.user;
  } catch (e: any) {
    console.error("❌ Get user profile error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to fetch user profile");
  }
};

/**
 * Persist FCM Token for Push Notifications
 */
export const persistFcmToken = async (fcmToken: string, deviceType: string) => {
  try {
    const token = await retriveData(KeyForStorage.accessToken);

    console.log('📤 Persisting FCM token');

    const response = await API.POST({
      URL: "users/fcm-token", // You may need to adjust this endpoint
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        fcmToken: fcmToken,
        deviceType: deviceType
      }
    });

    console.log('✅ FCM token persisted successfully');

    return response.data;
  } catch (e: any) {
    console.error("❌ FCM token persistence error:", e);
    throw new Error(e.message);
  }
};

/**
 * Google OAuth Sign In
 * GET /auth/google?type=user
 */
export const googleOAuthLogin = async () => {
  try {
    console.log('📤 Initiating Google OAuth for user');

    // Note: This should typically open a WebView or browser
    // The actual implementation depends on your OAuth flow
    const response = await API.GET({
      URL: "auth/google",
      params: {
        type: 'user'
      },
    });

    return response.data;
  } catch (e: any) {
    console.error("❌ Google OAuth error:", e);
    throw new Error(e.response?.data?.message || e.message || "Google sign-in failed");
  }
};

/**
 * Facebook OAuth Sign In
 * GET /auth/facebook?type=user
 */
export const facebookOAuthLogin = async () => {
  try {
    console.log('📤 Initiating Facebook OAuth for user');

    const response = await API.GET({
      URL: "auth/facebook",
      params: {
        type: 'user'
      },
    });

    return response.data;
  } catch (e: any) {
    console.error("❌ Facebook OAuth error:", e);
    throw new Error(e.response?.data?.message || e.message || "Facebook sign-in failed");
  }
};