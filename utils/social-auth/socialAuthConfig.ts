import * as WebBrowser from 'expo-web-browser';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  signInWithEmailAndPassword,
  UserCredential,
  AuthCredential,
} from 'firebase/auth';
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

// Conditionally import native Facebook SDK (only works in dev builds, not Expo Go)
let LoginManagerNative: any = null;
let FBAccessToken: any = null;
let FBProfile: any = null;

if (!isExpoGo) {
  try {
    const fbsdk = require('react-native-fbsdk-next');
    LoginManagerNative = fbsdk.LoginManager;
    FBAccessToken = fbsdk.AccessToken;
    FBProfile = fbsdk.Profile;
  } catch (e) {
    console.log('Native Facebook SDK not available');
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
 * Interface for Facebook native SDK auth result with profile data
 */
export interface FacebookProfileResult {
  type: 'success' | 'cancel' | 'error';
  accessToken?: string;
  profile?: {
    userID: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    imageURL?: string;
  };
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
 * Native Facebook Sign-In using react-native-fbsdk-next
 * Uses LoginManager, AccessToken, and Profile to get user data
 * This works in development builds and production, NOT in Expo Go
 */
export const signInWithFacebookNativeSDK = async (): Promise<FacebookProfileResult> => {
  if (!LoginManagerNative) {
    console.log('⚠️ Native Facebook SDK not available (running in Expo Go?)');
    return {
      type: 'error',
      error: 'Native Facebook SDK is not available in Expo Go. Please use a development build.',
    };
  }

  try {
    console.log('📱 Starting native Facebook Sign-In...');

    const result = await LoginManagerNative.logInWithPermissions(['public_profile', 'email']);

    if (result.isCancelled) {
      console.log('ℹ️ Facebook sign-in was cancelled');
      return { type: 'cancel', error: 'Facebook sign-in was cancelled' };
    }

    console.log('✅ Facebook login successful, getting access token...');
    const tokenData = await FBAccessToken.getCurrentAccessToken();

    if (!tokenData) {
      return { type: 'error', error: 'No access token received from Facebook' };
    }

    console.log('✅ Access token received, getting profile...');
    const currentProfile = await FBProfile.getCurrentProfile();

    console.log('✅ Facebook profile:', currentProfile);

    return {
      type: 'success',
      accessToken: tokenData.accessToken,
      profile: currentProfile ? {
        userID: currentProfile.userID,
        name: currentProfile.name || '',
        firstName: currentProfile.firstName || undefined,
        lastName: currentProfile.lastName || undefined,
        email: currentProfile.email || undefined,
        imageURL: currentProfile.imageURL || undefined,
      } : undefined,
    };
  } catch (error: any) {
    console.error('❌ Native Facebook Sign-In error:', error);
    return { type: 'error', error: error.message || 'Facebook sign-in failed' };
  }
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
 * Custom error for account-exists-with-different-credential
 */
export class AccountExistsWithDifferentCredentialError extends Error {
  email: string;
  existingProviders: string[];
  pendingCredential: AuthCredential | null;

  constructor(email: string, existingProviders: string[], pendingCredential: AuthCredential | null) {
    const providerNames = existingProviders.map(p => {
      if (p === 'password') return 'Email/Password';
      if (p === 'google.com') return 'Google';
      if (p === 'facebook.com') return 'Facebook';
      return p;
    });
    super(
      `This email (${email}) is already associated with ${providerNames.join(', ')}. ` +
      `Please sign in with ${providerNames[0] || 'your original method'} first, then link your Facebook account from settings.`
    );
    this.name = 'AccountExistsWithDifferentCredentialError';
    this.email = email;
    this.existingProviders = existingProviders;
    this.pendingCredential = pendingCredential;
  }
}

/**
 * Firebase Facebook Sign-In with credential
 * Use this to authenticate directly with Firebase using the Facebook access token.
 * 
 * Handles the auth/account-exists-with-different-credential error:
 * - If Google is the existing provider, automatically triggers Google sign-in,
 *   links the Facebook credential, and returns the user credential.
 * - For other providers, throws AccountExistsWithDifferentCredentialError
 *   so the UI can guide the user.
 */
export const firebaseSignInWithFacebook = async (accessToken: string): Promise<UserCredential> => {
  try {
    const credential = FacebookAuthProvider.credential(accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    console.log('✅ Firebase Facebook sign-in successful:', userCredential.user.email);
    return userCredential;
  } catch (error: any) {
    console.error('❌ Firebase Facebook sign-in error:', error);

    // Handle account-exists-with-different-credential
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || '';
      console.log('⚠️ Account exists with different credential for email:', email);

      let existingProviders: string[] = [];
      try {
        existingProviders = await fetchSignInMethodsForEmail(auth, email);
        console.log('📋 Existing providers for email:', existingProviders);
      } catch (fetchError) {
        console.error('❌ Error fetching sign-in methods:', fetchError);
      }

      // Get the pending Facebook credential for linking
      const pendingCredential = FacebookAuthProvider.credentialFromError(error);

      // AUTO-LINK: If Google is the existing provider, sign in with Google and link Facebook
      if (existingProviders.includes('google.com') && GoogleSignin) {
        console.log('🔗 Attempting auto-link: Google sign-in + Facebook credential linking...');
        try {
          // Step 1: Sign in with Google natively to get idToken
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const googleResponse = await GoogleSignin.signIn();

          if (isSuccessResponse && isSuccessResponse(googleResponse) && googleResponse.data?.idToken) {
            const googleCredential = GoogleAuthProvider.credential(googleResponse.data.idToken);
            const googleUserCredential = await signInWithCredential(auth, googleCredential);
            console.log('✅ Google sign-in successful for linking:', googleUserCredential.user.email);

            // Step 2: Link Facebook credential to the Google account
            if (pendingCredential && googleUserCredential.user) {
              try {
                const linkedResult = await linkWithCredential(googleUserCredential.user, pendingCredential);
                console.log('✅ Facebook credential linked to Google account successfully');
                return linkedResult;
              } catch (linkError: any) {
                // If already linked or provider-already-linked, just return the Google credential
                if (linkError.code === 'auth/provider-already-linked') {
                  console.log('ℹ️ Facebook already linked to this account');
                  return googleUserCredential;
                }
                console.warn('⚠️ Could not link Facebook credential, but Google sign-in succeeded:', linkError.message);
                return googleUserCredential;
              }
            }

            // Even without linking, sign-in with Google succeeded for the same email
            return googleUserCredential;
          } else {
            console.log('❌ Google sign-in cancelled or failed during auto-link');
          }
        } catch (googleError: any) {
          console.error('❌ Auto-link Google sign-in failed:', googleError.message);
          // Fall through to throw the error so UI can handle it
        }
      }

      throw new AccountExistsWithDifferentCredentialError(
        email,
        existingProviders,
        pendingCredential,
      );
    }

    throw error;
  }
};

/**
 * Link Facebook credential to an existing Firebase account.
 * Call this after the user has signed in with their existing provider.
 * @param accessToken - The Facebook access token to link
 */
export const linkFacebookToCurrentUser = async (accessToken: string): Promise<UserCredential | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No current user to link Facebook credential to');
      return null;
    }

    const credential = FacebookAuthProvider.credential(accessToken);
    const result = await linkWithCredential(currentUser, credential);
    console.log('✅ Facebook credential linked to existing account');
    return result;
  } catch (error: any) {
    // If already linked, that's fine
    if (error.code === 'auth/provider-already-linked') {
      console.log('ℹ️ Facebook provider already linked to this account');
      return null;
    }
    console.error('❌ Error linking Facebook credential:', error);
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
