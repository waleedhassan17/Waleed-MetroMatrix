/**
 * Facebook Authentication Service
 * 
 * Handles Facebook OAuth login and signup using expo-facebook
 * Integrates with backend /auth/facebook-login and /auth/facebook-signup endpoints
 * 
 * YOUR FACEBOOK APP ID: 2277966629368711
 */

import * as Facebook from 'expo-facebook';
import { network } from '../network/network';

// Types
interface FacebookLoginResponse {
  success: boolean;
  message: string;
  isNewUser: boolean;
  userType: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    profilePhoto?: string;
    phoneNumber: string;
    profileComplete: boolean;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Initialize Facebook SDK
 * Must be called before any Facebook operations
 */
export const initializeFacebook = async (): Promise<void> => {
  try {
    await Facebook.initializeAsync({
      appId: '2277966629368711', // ✅ YOUR Facebook App ID
      appName: 'MetroMatrix',
    });
    console.log('✅ Facebook SDK initialized successfully with App ID: 2277966629368711');
  } catch (error) {
    console.error('❌ Facebook SDK initialization error:', error);
    throw new Error('Failed to initialize Facebook SDK');
  }
};

/**
 * Facebook Login (Creates account if doesn't exist, logs in if exists)
 * @param userType - 'user' or 'provider'
 * @returns Authentication response with tokens and user data
 */
export const facebookLogin = async (
  userType: 'user' | 'provider' = 'user'
): Promise<FacebookLoginResponse> => {
  try {
    console.log(`🔵 Starting Facebook login for ${userType}...`);

    // Request Facebook permissions
    const { type, token, expirationDate } = await Facebook.logInWithReadPermissionsAsync({
      permissions: ['public_profile', 'email'],
    });

    console.log('📱 Facebook login response:', { type, hasToken: !!token });

    // Handle user cancellation
    if (type === 'cancel') {
      throw new Error('Facebook login was cancelled by user');
    }

    // Check if token was received
    if (!token) {
      throw new Error('No access token received from Facebook');
    }

    console.log('✅ Facebook access token received');
    console.log('🔑 Token expires:', expirationDate);

    // Send token to backend for authentication
    console.log('📤 Sending token to backend...');
    const response = await network.post<FacebookLoginResponse>(
      '/auth/facebook-login',
      {
        accessToken: token,
        userType,
      }
    );

    console.log('📥 Backend response:', {
      success: response.data.success,
      isNewUser: response.data.isNewUser,
      hasUser: !!response.data.user,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Facebook login failed on backend');
    }

    console.log('✅ Facebook authentication successful');
    return response.data;

  } catch (error: any) {
    console.error('❌ Facebook login error:', error);
    
    // Handle specific errors
    if (error.message?.includes('cancel')) {
      throw new Error('Facebook login was cancelled');
    }
    
    if (error.message?.includes('permission')) {
      throw new Error('Email permission is required. Please grant email access in Facebook settings.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Facebook login failed. Please try again.');
  }
};

/**
 * Facebook Signup (Creates new account only, returns error if exists)
 * @param userType - 'user' or 'provider'
 * @returns Authentication response with tokens and user data
 */
export const facebookSignup = async (
  userType: 'user' | 'provider' = 'user'
): Promise<FacebookLoginResponse> => {
  try {
    console.log(`🔵 Starting Facebook signup for ${userType}...`);

    // Request Facebook permissions
    const { type, token } = await Facebook.logInWithReadPermissionsAsync({
      permissions: ['public_profile', 'email'],
    });

    console.log('📱 Facebook signup response:', { type, hasToken: !!token });

    // Handle user cancellation
    if (type === 'cancel') {
      throw new Error('Facebook signup was cancelled by user');
    }

    // Check if token was received
    if (!token) {
      throw new Error('No access token received from Facebook');
    }

    console.log('✅ Facebook access token received');

    // Send token to backend for signup
    console.log('📤 Sending token to backend for signup...');
    const response = await network.post<FacebookLoginResponse>(
      '/auth/facebook-signup',
      {
        accessToken: token,
        userType,
      }
    );

    console.log('📥 Backend signup response:', {
      success: response.data.success,
      hasUser: !!response.data.user,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Facebook signup failed on backend');
    }

    console.log('✅ Facebook signup successful');
    return response.data;

  } catch (error: any) {
    console.error('❌ Facebook signup error:', error);
    
    // Handle account already exists (409 Conflict)
    if (error.response?.status === 409) {
      throw new Error('An account with this email already exists. Please use login instead.');
    }
    
    if (error.message?.includes('cancel')) {
      throw new Error('Facebook signup was cancelled');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Facebook signup failed. Please try again.');
  }
};

/**
 * Get Facebook user profile
 * @param accessToken - Facebook access token
 * @returns User profile data from Facebook
 */
export const getFacebookProfile = async (accessToken: string) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      picture: data.picture?.data?.url,
    };
  } catch (error: any) {
    console.error('❌ Error fetching Facebook profile:', error);
    throw error;
  }
};

/**
 * Logout from Facebook
 */
export const facebookLogout = async (): Promise<void> => {
  try {
    await Facebook.logOutAsync();
    console.log('✅ Logged out from Facebook');
  } catch (error) {
    console.error('❌ Facebook logout error:', error);
    throw error;
  }
};

export default {
  initializeFacebook,
  facebookLogin,
  facebookSignup,
  getFacebookProfile,
  facebookLogout,
};
