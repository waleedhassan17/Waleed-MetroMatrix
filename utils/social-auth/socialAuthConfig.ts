import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '628749958814-6hkqbpv58s2hcaqfafpek66jmh1oa0md.apps.googleusercontent.com';

// Facebook App ID
const FACEBOOK_APP_ID = '896521822898320';

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
 * Hook for Google Sign-In using Expo's auth session
 * Note: For Android standalone builds, you need to create an Android OAuth Client ID
 * in Google Cloud Console with your app's SHA-1 fingerprint
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Web client ID works for Expo Go development
    clientId: GOOGLE_WEB_CLIENT_ID,
    // For standalone Android builds, create an Android OAuth Client ID in Google Cloud Console
    // with SHA-1 fingerprint: keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
    androidClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
  });

  return {
    request,
    response,
    promptAsync,
    isReady: !!request,
  };
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
 */
export const processGoogleResponse = (response: any): SocialAuthResult => {
  if (response?.type === 'success') {
    const { params, authentication } = response;
    
    // Try to get idToken from different possible locations
    const idToken = params?.id_token || authentication?.idToken || authentication?.accessToken;
    
    if (idToken) {
      return {
        type: 'success',
        idToken: idToken,
        accessToken: authentication?.accessToken,
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
