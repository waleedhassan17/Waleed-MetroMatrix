import { Platform } from 'react-native';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
//@ts-ignore - getReactNativePersistence exists at runtime in RN bundle
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ALIGNED to metromatrix-c44c6 (2026-08-02): this project must match the
// backend's FIREBASE_PROJECT_ID exactly, because admin.auth().verifyIdToken()
// on the backend checks the token's issuer/audience against ITS configured
// project — a token minted against a different Firebase project (the old
// value here was metromatrix-31f9f) is always rejected, regardless of
// whether the token itself is otherwise perfectly valid. See
// BUILD_AND_SHARE.md's "Blocking config mismatches" section for the full
// trace of how this was found. Real values below are from the
// metromatrix-c44c6 Firebase console (Project settings -> General -> Your
// apps -> Web app -> SDK setup and configuration).
const firebaseConfig = {
  apiKey: "AIzaSyBKsfEEA2QNsCuDGZPMFd12exZ4etUKUq8",
  authDomain: "metromatrix-c44c6.firebaseapp.com",
  projectId: "metromatrix-c44c6",
  storageBucket: "metromatrix-c44c6.firebasestorage.app",
  messagingSenderId: "942315940095",
  appId: "1:942315940095:web:38d64830e5185f390204ca",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// On web, AsyncStorage-based RN persistence is invalid (it crashes at startup) —
// use the default browser persistence via getAuth(). On native, keep AsyncStorage
// persistence so auth state survives app restarts.
let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth =
    getApps().length > 1
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
}

export { app, auth };
