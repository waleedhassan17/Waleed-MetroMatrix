import { Platform } from 'react-native';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
//@ts-ignore - getReactNativePersistence exists at runtime in RN bundle
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDR0ZrvsGGP_nVy0-nyqoRmouNbm8UbX8g",
  authDomain: "metromatrix-31f9f.firebaseapp.com",
  projectId: "metromatrix-31f9f",
  storageBucket: "metromatrix-31f9f.firebasestorage.app",
  messagingSenderId: "1007229712045",
  appId: "1:1007229712045:web:87aba36a12808670d87824",
  measurementId: "G-S8VTDKBZF1"
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
