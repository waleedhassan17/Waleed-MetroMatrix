import * as WebBrowser from 'expo-web-browser';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { GoogleAuthProvider, FacebookAuthProvider, signInWithCredential, UserCredential } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import Constants from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally import native Google Sign-In (only works in dev builds, not Expo Go)
let GoogleSignin: any = null;
let statusCodes: any = null;
let isSuccessResponse: any = null;
let isErrorWithCode: any = null;

if (!isExpoGo) {
  try {
    const nativeGoogleSignIn = require('@react-native-google-signin/google-signin');
    GoogleSignin = nativeGoogleSignIn.GoogleSignin;
    statusCodes = nativeGoogleSignIn.statusCodes;
    isSuccessResponse = nativeGoogleSignIn.isSuccessResponse;
    isErrorWithCode = nativeGoogleSignIn.isErrorWithCode;
  } catch (e) {
    console.log('Native Google Sign-In not available');
  }
}

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs from android/app/google-services.json
// Web Client ID (client_type: 3) - required for Firebase auth and idToken
const GOOGLE_WEB_CLIENT_ID = '1007229712045-hepjj2fjm3laq4amgjt0frij6hu0h8s4.apps.googleusercontent.com';

// Android Client ID (client_type: 1) - tied to Android package and SHA1
const GOOGLE_ANDROID_CLIENT_ID = '1007229712045-82v1qkdr7jt6d6cuuko3q59s16h28b2n.apps.googleusercontent.com';

// iOS Client ID - set when iOS config is available
const GOOGLE_IOS_CLIENT_ID = '';

// Facebook App ID
const FACEBOOK_APP_ID = '2277966629368711';

// Configure Google Sign-In for native implementation (only in dev builds)
if (GoogleSignin && !isExpoGo) {
  const config: Record<string, unknown> = {
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: ['profile', 'email'],
  };

  if (GOOGLE_IOS_CLIENT_ID) {
    config.iosClientId = GOOGLE_IOS_CLIENT_ID;
  }

  GoogleSignin.configure(config);
}

/**
 * Interface for social auth result
 */
export interface SocialAuthResult {
  type: 'success' | 'cancel' | 'error';
  idToken?: string;      // For Google
  accessToken?: string;  // For Facebook/Google
  error?: string;
}

/**
 * Native Google Sign-In using @react-native-google-signin/google-signin
 * This works in development builds and production, NOT in Expo Go
 */
export const signInWithGoogleNativeSDK = async (): Promise<SocialAuthResult> => {
  // Check if native module is available
  if (!GoogleSignin) {
    console.log('⚠️ Native Google Sign-In not available (running in Expo Go?)');
    return {
      type: 'error',
      error: 'Native Google Sign-In is not available in Expo Go. Please use a development build.',
    };
  }

  try {
    console.log('📱 Starting native Google Sign-In...');
    
    // Check if Google Play Services are available
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Sign in
    const response = await GoogleSignin.signIn();
    
    if (isSuccessResponse && isSuccessResponse(response)) {
      console.log('✅ Native Google Sign-In successful');
      const { idToken } = response.data;
      
      if (idToken) {
        return {
          type: 'success',
          idToken: idToken,
        };
      }
      
      return {
        type: 'error',
        error: 'No ID token received from Google',
      };
    } else {
      return {
        type: 'cancel',
        error: 'Google sign-in was cancelled',
      };
    }
  } catch (error: any) {
    console.error('❌ Native Google Sign-In error:', error);
    
    if (isErrorWithCode && isErrorWithCode(error) && statusCodes) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { type: 'cancel', error: 'Sign-in cancelled' };
        case statusCodes.IN_PROGRESS:
          return { type: 'error', error: 'Sign-in already in progress' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { type: 'error', error: 'Google Play Services not available' };
        default:
          return { type: 'error', error: error.message || 'Unknown error' };
      }
    }
    
    return { type: 'error', error: error.message || 'Google sign-in failed' };
  }
};

/**
 * Hook for Google Sign-In - uses native SDK in dev builds, expo-auth-session in Expo Go
 */
export const useGoogleAuth = () => {
  // Check if running in Expo Go (development)
  const currentIsExpoGo = Constants.appOwnership === 'expo';
  
  console.log('📱 Is Expo Go:', currentIsExpoGo);
  
  // For Expo Go, use the Expo auth proxy
  const redirectUri = 'https://auth.expo.io/@waleed17/MetroMatrix';
  
  console.log('📱 Redirect URI:', redirectUri);
  
  // Use implicit flow (id_token) without PKCE for Expo Go compatibility
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });
  
  console.log('📱 Auth request ready:', !!request);

  // For dev builds, provide a native prompt function
  const nativePromptAsync = async () => {
    if (!currentIsExpoGo && GoogleSignin) {
      // Use native Google Sign-In SDK
      return signInWithGoogleNativeSDK();
    }
    // Fall back to expo-auth-session for Expo Go
    return promptAsync();
  };

  return {
    request,
    response,
    promptAsync: currentIsExpoGo ? promptAsync : nativePromptAsync,
    isReady: currentIsExpoGo ? !!request : true,
    isNative: !currentIsExpoGo && !!GoogleSignin,
  };
};

/**
 * Google Sign-In function using expo-auth-session
 * Works with Expo Go - no native module required
 */
export const signInWithGoogleNative = async (promptAsync: () => Promise<any>): Promise<SocialAuthResult> => {
  try {
    const response = await promptAsync();
    return processGoogleResponse(response);
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    return {
      type: 'error',
      error: error.message || 'Google sign-in failed',
    };
  }
};

/**
 * Sign out from Google (no-op for expo-auth-session)
 */
export const signOutFromGoogle = async () => {
  try {
    // expo-auth-session doesn't maintain session state
    // Sign out is handled by Firebase
    console.log('✅ Signed out from Google');
  } catch (error) {
    console.error('❌ Error signing out from Google:', error);
  }
};

/**
 * Hook for Facebook Sign-In using Expo's auth session
 */
export const useFacebookAuth = () => {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  return {
    request,
    response,
    promptAsync,
    isReady: !!request,
  };
};

/**
 * Process Google auth response
 * Handles response from useIdTokenAuthRequest which returns id_token in params
 */
export const processGoogleResponse = (response: any): SocialAuthResult => {
  console.log('📥 Processing Google response:', JSON.stringify(response, null, 2));
  
  if (response?.type === 'success') {
    const { params, authentication } = response;
    
    // For useIdTokenAuthRequest, id_token is in params
    // For useAuthRequest, it might be in authentication
    const idToken = params?.id_token || authentication?.idToken;
    const accessToken = params?.access_token || authentication?.accessToken;
    
    console.log('📥 Extracted tokens - idToken:', !!idToken, 'accessToken:', !!accessToken);
    
    if (idToken) {
      return {
        type: 'success',
        idToken: idToken,
        accessToken: accessToken,
      };
    }
    
    // Fallback to accessToken if no idToken
    if (accessToken) {
      return {
        type: 'success',
        idToken: accessToken, // Use accessToken as fallback
        accessToken: accessToken,
      };
    }
    
    return {
      type: 'error',
      error: 'No authentication token received from Google',
    };
  } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
    return {
      type: 'cancel',
      error: 'Google sign-in was cancelled',
    };
  } else {
    return {
      type: 'error',
      error: 'Google sign-in failed',
    };
  }
};

/**
 * Process Facebook auth response
 */
export const processFacebookResponse = (response: any): SocialAuthResult => {
  if (response?.type === 'success') {
    const { params, authentication } = response;
    
    const accessToken = params?.access_token || authentication?.accessToken;
    
    if (accessToken) {
      return {
        type: 'success',
        accessToken: accessToken,
      };
    }
    
    return {
      type: 'error',
      error: 'No access token received from Facebook',
    };
  } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
    return {
      type: 'cancel',
      error: 'Facebook sign-in was cancelled',
    };
  } else {
    return {
      type: 'error',
      error: 'Facebook sign-in failed',
    };
  }
};

/**
 * Check if social auth is available
 * Returns true since backend handles credentials
 */
export const isSocialAuthConfigured = (): { google: boolean; facebook: boolean } => {
  return {
    google: true,
    facebook: true,
  };
};

/**
 * Firebase Google Sign-In with credential
 * Use this to authenticate directly with Firebase using the Google ID token
 */
export const firebaseSignInWithGoogle = async (idToken: string): Promise<UserCredential> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    console.log('✅ Firebase Google sign-in successful:', userCredential.user.email);
    return userCredential;
  } catch (error: any) {
    console.error('❌ Firebase Google sign-in error:', error);
    throw error;
  }
};

/**
 * Firebase Facebook Sign-In with credential
 * Use this to authenticate directly with Firebase using the Facebook access token
 */
export const firebaseSignInWithFacebook = async (accessToken: string): Promise<UserCredential> => {
  try {
    const credential = FacebookAuthProvider.credential(accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    console.log('✅ Firebase Facebook sign-in successful:', userCredential.user.email);
    return userCredential;
  } catch (error: any) {
    console.error('❌ Firebase Facebook sign-in error:', error);
    throw error;
  }
};

/**
 * Get Firebase ID Token from authenticated user
 * Useful for sending to your backend for verification
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      return idToken;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting Firebase ID token:', error);
    return null;
  }
};
