// networks/authcalls/userSignin.ts
// ✅ FIXED: Properly implements Firebase authentication for Google Sign-In

import { API } from "../network/network";
import { retrieveData, KeyForStorage } from "../../utils/storage_utils/storageUtils";
import { UserLoginData, UserAuthResponse } from "../../models/user";

import { Platform } from "react-native";

// Firebase imports
import { 
  signInWithCredential, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider 
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Native SDK imports (conditionally loaded)
let GoogleSignin: any;
let LoginManager: any;
let AccessToken: any;

if (Platform.OS !== 'web') {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch (e) {
    console.warn('Google Sign-In SDK not available');
  }
  
  try {
    const FBSDK = require('react-native-fbsdk-next');
    LoginManager = FBSDK.LoginManager;
    AccessToken = FBSDK.AccessToken;
  } catch (e) {
    console.warn('Facebook SDK not available');
  }
}


/**
 * User Sign In (Login) - Email/Password
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
 * ✅ FIXED: Google OAuth Sign In with Firebase Authentication
 * Works on Web (expo-auth-session) and Native (Google Sign-In SDK)
 * 
 * Flow:
 * 1. User signs in with Google (Native SDK)
 * 2. Get Google OAuth token from SDK
 * 3. Authenticate with Firebase using Google token
 * 4. Get Firebase ID token
 * 5. Send Firebase token to MetroMatrix backend
 * 6. Backend verifies Firebase token and returns user + access token
 */
export const googleOAuthLogin = async (): Promise<UserAuthResponse> => {
  try {
    console.log('🚀 Starting Google OAuth login for user');
    console.log('📱 Platform:', Platform.OS);

    let firebaseIdToken: string | null = null;

    // Platform-specific Google Sign-In
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // ===== NATIVE GOOGLE SIGN-IN =====
      if (!GoogleSignin) {
        throw new Error('Google Sign-In SDK not initialized');
      }

      console.log('📱 Using native Google Sign-In SDK');
      
      // Sign out first to force account selection
      await GoogleSignin.signOut();
      
      // Check Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Native Google sign-in successful:', userInfo.data.user.email);
      
      // ✅ FIX: Get Google OAuth token from SDK
      const googleToken = userInfo.data.idToken;
      
      if (!googleToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      console.log('🔐 Authenticating with Firebase...');
      
      // ✅ FIX: Authenticate with Firebase using Google token
      const credential = GoogleAuthProvider.credential(googleToken);
      const firebaseUserCredential = await signInWithCredential(auth, credential);
      
      // ✅ FIX: Get Firebase ID token (this is what backend expects!)
      firebaseIdToken = await firebaseUserCredential.user.getIdToken();
      
      if (!firebaseIdToken) {
        throw new Error('Failed to get Firebase ID token');
      }

      console.log('✅ Firebase ID token obtained');

    } else {
      // ===== WEB GOOGLE SIGN-IN =====
      // This should be handled by expo-auth-session in the component
      // The component will call googleOAuthLoginWithToken instead
      throw new Error('Web Google Sign-In should be handled by expo-auth-session in the component');
    }

    // ===== SEND FIREBASE TOKEN TO YOUR BACKEND =====
    console.log('📤 Sending Firebase token to MetroMatrix backend');

    const response = await API.POST({
      URL: "auth/google-login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        idToken: firebaseIdToken,
        userType: 'user', // Distinguish from provider
      },
    });

    console.log('✅ Backend authentication successful:', response.data);

    // Validate response
    if (!response.data || !response.data.user || !response.data.accessToken) {
      throw new Error('Invalid response from server');
    }

    const authResponse: UserAuthResponse = {
      success: response.data.success ?? true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || '',
    };

    return authResponse;

  } catch (e: any) {
    console.error("❌ Google OAuth error:", e);
    
    // Handle specific Google Sign-In errors
    if (e.code === 'sign_in_cancelled') {
      throw new Error('Google sign-in was cancelled');
    } else if (e.code === 'in_progress') {
      throw new Error('Google sign-in already in progress');
    } else if (e.code === 'play_services_not_available') {
      throw new Error('Google Play Services not available');
    }
    
    throw new Error(e.message || 'Google sign-in failed');
  }
};

/**
 * ✅ NEW: Facebook OAuth Sign In - REAL IMPLEMENTATION
 * Works on Web (expo-auth-session) and Native (Facebook SDK)
 * 
 * Flow:
 * 1. User signs in with Facebook (Web or Native)
 * 2. Get Facebook access token
 * 3. Send token to YOUR MetroMatrix backend
 * 4. Backend verifies token and returns user + access token
 */
export const facebookOAuthLogin = async (): Promise<UserAuthResponse> => {
  try {
    console.log('🚀 Starting Facebook OAuth login for user');
    console.log('📱 Platform:', Platform.OS);

    let facebookAccessToken: string | null = null;

    // Platform-specific Facebook Sign-In
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // ===== NATIVE FACEBOOK SIGN-IN =====
      if (!LoginManager || !AccessToken) {
        throw new Error('Facebook SDK not initialized');
      }

      console.log('📱 Using native Facebook SDK');
      
      // Request Facebook login with permissions
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        throw new Error('Facebook sign-in was cancelled');
      }

      // Get access token
      const data = await AccessToken.getCurrentAccessToken();
      
      if (!data || !data.accessToken) {
        throw new Error('No access token received from Facebook');
      }

      facebookAccessToken = data.accessToken;
      console.log('✅ Facebook access token obtained from native SDK');

    } else {
      // ===== WEB FACEBOOK SIGN-IN =====
      // This should be handled by expo-auth-session in the component
      // The component will pass the token to this function
      throw new Error('Web Facebook Sign-In should be handled by expo-auth-session in the component');
    }

    // ===== SEND TOKEN TO YOUR BACKEND =====
    console.log('📤 Sending Facebook token to MetroMatrix backend');

    const response = await API.POST({
      URL: "auth/facebook-login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        accessToken: facebookAccessToken,
        userType: 'user', // Distinguish from provider
      },
    });

    console.log('✅ Backend authentication successful:', response.data);

    // Validate response
    if (!response.data || !response.data.user || !response.data.accessToken) {
      throw new Error('Invalid response from server');
    }

    const authResponse: UserAuthResponse = {
      success: response.data.success ?? true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || '',
    };

    return authResponse;

  } catch (e: any) {
    console.error("❌ Facebook OAuth error:", e);
    throw new Error(e.message || 'Facebook sign-in failed');
  }
};

/**
 * ✅ FIXED: Helper function for Web Google Sign-In
 * Called from the component after expo-auth-session completes
 * Converts expo-auth-session ID token to Firebase token, then sends to backend
 */
export const googleOAuthLoginWithToken = async (expoIdToken: string): Promise<UserAuthResponse> => {
  try {
    console.log('📤 Authenticating with Google ID token via Firebase');

    // ✅ FIX: The expo-auth-session token IS a valid Google token
    // We need to authenticate with Firebase first to get a Firebase ID token
    console.log('🔐 Authenticating with Firebase...');
    
    const credential = GoogleAuthProvider.credential(expoIdToken);
    const firebaseUserCredential = await signInWithCredential(auth, credential);
    
    // Get Firebase ID token
    const firebaseIdToken = await firebaseUserCredential.user.getIdToken();
    
    if (!firebaseIdToken) {
      throw new Error('Failed to get Firebase ID token');
    }

    console.log('✅ Firebase ID token obtained for web');

    // Now send Firebase token to backend
    const response = await API.POST({
      URL: "auth/google-login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        idToken: firebaseIdToken,
        userType: 'user',
      },
    });

    console.log('✅ Backend authentication successful');

    if (!response.data || !response.data.user || !response.data.accessToken) {
      throw new Error('Invalid response from server');
    }

    const authResponse: UserAuthResponse = {
      success: response.data.success ?? true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || '',
    };

    return authResponse;

  } catch (e: any) {
    console.error("❌ Google token authentication error:", e);
    throw new Error(e.response?.data?.message || e.message || 'Authentication failed');
  }
};

/**
 * ✅ NEW: Helper function for Web Facebook Sign-In
 * Called from the component after expo-auth-session completes
 */
export const facebookOAuthLoginWithToken = async (accessToken: string): Promise<UserAuthResponse> => {
  try {
    console.log('📤 Authenticating with Facebook access token via backend');

    const response = await API.POST({
      URL: "auth/facebook-login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        accessToken,
        userType: 'user',
      },
    });

    console.log('✅ Backend authentication successful');

    if (!response.data || !response.data.user || !response.data.accessToken) {
      throw new Error('Invalid response from server');
    }

    const authResponse: UserAuthResponse = {
      success: response.data.success ?? true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || '',
    };

    return authResponse;

  } catch (e: any) {
    console.error("❌ Facebook token authentication error:", e);
    throw new Error(e.response?.data?.message || e.message || 'Authentication failed');
  }
};

// ===== EXISTING FUNCTIONS (UNCHANGED) =====

/**
 * User Logout
 * POST /auth/logout
 */
export const authLogout = async () => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

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
    const token = await retrieveData(KeyForStorage.accessToken);

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
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Persisting FCM token');

    const response = await API.POST({
      URL: "users/fcm-token",
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
