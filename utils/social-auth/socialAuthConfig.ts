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

// ALIGNED to metromatrix-c44c6 (2026-08-02) — must match the backend's
// GOOGLE_CLIENT_ID / FIREBASE_PROJECT_ID exactly, since this is the
// audience the resulting ID token carries and admin.auth().verifyIdToken()
// checks it against the backend's own project. See BUILD_AND_SHARE.md.
//
// Web Client ID (client_type: 3) - required for Firebase auth and idToken.
// This value is the backend's known-good GOOGLE_CLIENT_ID (.env), so it's
// correct as-is, not a placeholder.
const GOOGLE_WEB_CLIENT_ID = '942315940095-t465i8sfr4dc3m685fm9juqm8d4o49c5.apps.googleusercontent.com';

// Android Client ID (client_type: 1) - tied to the Android package + SHA-1.
// RESOLVED (2026-08-02): registered under project metromatrix-c44c6 for
// package com.metromatrix.app with the debug/dev keystore's SHA-1
// (5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25). This
// constant isn't currently passed into GoogleSignin.configure() below
// (Android resolves its native client by package+SHA-1 automatically) —
// kept here for documentation/reference.
//
// NOTE: this fingerprint is the local dev/debug keystore's SHA-1. The EAS
// **build** keystore (used for the shareable preview APK from eas.md) has a
// DIFFERENT SHA-1 and must be added as a second fingerprint on the same
// Firebase Android app before that APK's native Google Sign-In will work —
// see BUILD_AND_SHARE.md §4 (`eas credentials`).
const GOOGLE_ANDROID_CLIENT_ID = '942315940095-fvodke6uh00g3ooshvi56jcch6glk6oo.apps.googleusercontent.com';

// iOS Client ID - set when iOS config is available
const GOOGLE_IOS_CLIENT_ID = '';

// Facebook App ID — ALIGNED to 26818541697736156 (2026-08-02), the one you
// confirmed matches the backend's FACEBOOK_APP_ID. The old value
// (2277966629368711) was a different Facebook app entirely — see
// BUILD_AND_SHARE.md for the full mismatch this replaces.
const FACEBOOK_APP_ID = '26818541697736156';

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
    
    // Clear the cached account first. Without this the native SDK silently
    // reuses the last account it signed in with and never shows the picker,
    // so a user can't switch accounts or sign in as someone else.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Nothing cached — first sign-in on this device.
    }

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
 * Hook for Google Sign-In - uses native SDK in dev builds, expo-auth-session in Expo Go.
 *
 * Dev/production builds NEVER fall back to the expo-auth-session browser flow:
 * expo-auth-session 7.x removed the auth.expo.io proxy entirely ("Remove all
 * auth proxy APIs" in its changelog), so a hardcoded auth.expo.io redirect can
 * never complete the round trip back into the app — it's the exact cause of
 * "Something went wrong trying to finish signing in" after account selection.
 * If the native module failed to load in a dev build, that's a build problem
 * (the google-signin config plugin needs a native rebuild to take effect),
 * not something a browser-proxy fallback can paper over — so we surface a
 * clear error instead of silently opening the dead proxy.
 */
export const useGoogleAuth = () => {
  // Check if running in Expo Go (development)
  const currentIsExpoGo = Constants.appOwnership === 'expo';

  console.log('📱 Is Expo Go:', currentIsExpoGo);

  // The expo-auth-session request object is only needed in Expo Go, where the
  // native module can never be linked. Use a native redirect (the app's own
  // "metromatrix" scheme), not the dead auth.expo.io proxy.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'metromatrix' }),
  });

  // For dev/production builds, always go through the native SDK.
  const nativePromptAsync = async (): Promise<SocialAuthResult> => {
    if (!GoogleSignin) {
      return {
        type: 'error',
        error:
          'Google Sign-In native module is not loaded in this build. This usually means the dev ' +
          'client was built before the @react-native-google-signin/google-signin plugin was added ' +
          'to app.json — rebuild the dev client (eas build --profile development) and reinstall.',
      };
    }
    return signInWithGoogleNativeSDK();
  };

  return {
    request,
    response,
    promptAsync: currentIsExpoGo ? promptAsync : nativePromptAsync,
    isReady: currentIsExpoGo ? !!request : true,
    isNative: !currentIsExpoGo,
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
    // Clear the native SDK's cached account too — Firebase sign-out alone
    // leaves it behind, so the next sign-in would silently reuse this account.
    if (GoogleSignin) {
      await GoogleSignin.signOut();
    }
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

    // Drop the cached Facebook grant first, otherwise the SDK reuses the
    // existing token and logs straight in without showing the account chooser.
    try {
      await LoginManagerNative.logOut();
    } catch {
      // Nothing cached to clear.
    }

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
 * Sign in to Firebase with a raw Google ID token and return a Firebase ID
 * token for the backend — without ever dead-ending on a provider collision.
 *
 * Why this exists (task.md Issue 2): `firebaseSignInWithGoogle` throws
 * `auth/account-exists-with-different-credential` when the email is already
 * registered in Firebase under another provider. The screens turned that into
 * the "Account Already Exists" modal and stopped — even though our backend's
 * /auth/google-login find-or-creates by googleId OR email and auto-links, so
 * it would have signed the user straight in.
 *
 * Three things make the collision survivable here:
 *  1. Google is a *trusted* provider for its own verified email, so Firebase
 *     normally links automatically. The collision only appears when the
 *     project is set to "one account per email address" — the config half of
 *     this fix (Firebase Console → Authentication → Settings).
 *  2. If we do collide, we try to link the pending Google credential onto the
 *     currently signed-in Firebase user.
 *  3. Failing that, we fall back to any usable Firebase session we already
 *     have, so the backend still receives a valid ID token and can link by
 *     email on its side.
 *
 * @param rawGoogleIdToken the ID token from the native Google SDK / auth session
 * @returns a Firebase ID token to send to /auth/google-login
 */
export const resolveGoogleFirebaseIdToken = async (
  rawGoogleIdToken: string,
): Promise<string | null> => {
  const credential = GoogleAuthProvider.credential(rawGoogleIdToken);

  try {
    const userCredential = await signInWithCredential(auth, credential);
    console.log('✅ Firebase Google sign-in successful:', userCredential.user.email);
    return await userCredential.user.getIdToken();
  } catch (error: any) {
    if (error.code !== 'auth/account-exists-with-different-credential') {
      console.error('❌ Firebase Google sign-in error:', error);
      throw error;
    }

    const email = error.customData?.email || '';
    console.log(
      '⚠️ Google credential collided with an existing Firebase account for:',
      email,
      '— attempting to link instead of failing.',
    );

    // (2) Link the pending Google credential onto the current session, if any.
    const pendingCredential = GoogleAuthProvider.credentialFromError(error) || credential;
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        const linked = await linkWithCredential(currentUser, pendingCredential);
        console.log('✅ Google credential linked to the existing Firebase account');
        return await linked.user.getIdToken();
      } catch (linkError: any) {
        if (linkError.code === 'auth/provider-already-linked') {
          console.log('ℹ️ Google already linked to this account');
          return await currentUser.getIdToken();
        }
        console.warn('⚠️ Could not link Google credential:', linkError.message);
      }

      // (3) Already signed in as the same person — good enough for the
      // backend, which links by email.
      return await currentUser.getIdToken();
    }

    // Nothing we can do client-side. Report it in terms of the actual fix
    // rather than the old "go sign in another way first" dead end.
    let existingProviders: string[] = [];
    try {
      existingProviders = await fetchSignInMethodsForEmail(auth, email);
    } catch (fetchError) {
      console.error('❌ Error fetching sign-in methods:', fetchError);
    }

    throw new AccountExistsWithDifferentCredentialError(
      email,
      existingProviders,
      pendingCredential,
    );
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

    // Facebook error #100 ("App_id in the input_token did not match the
    // Viewing App") means Firebase's own Facebook provider (Firebase Console
    // -> Authentication -> Sign-in method -> Facebook) has a different App
    // ID/Secret than the one that minted this token. Surface a clear,
    // actionable message instead of Firebase's raw Graph API error text.
    if (
      error.code === 'auth/invalid-credential' &&
      typeof error.message === 'string' &&
      (error.message.includes('did not match the Viewing App') || error.message.includes('"code":100'))
    ) {
      throw new Error(
        'Facebook app configuration mismatch: the Facebook App ID configured in the Firebase console ' +
        `(Authentication -> Sign-in method -> Facebook) does not match this app's Facebook App ID ` +
        `(${FACEBOOK_APP_ID}). Update the Firebase console's Facebook provider App ID/App Secret to match.`
      );
    }

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
