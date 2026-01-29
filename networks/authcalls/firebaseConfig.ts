// firebaseConfig.ts
// Firebase configuration for MetroMatrix social authentication
// Place this file in: RealProject/networks/authcalls/firebaseConfig.ts

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

/**
 * ⚠️ IMPORTANT: Replace these values with YOUR MetroMatrix Firebase credentials
 * 
 * To get these credentials:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your MetroMatrix project (or create one)
 * 3. Go to Project Settings (gear icon)
 * 4. Scroll down to "Your apps" section
 * 5. Click on the Web app (</> icon)
 * 6. Copy the firebaseConfig object
 */

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// 🔴 REPLACE WITH YOUR METROMATRIX FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBKsfEEA2QNsCuDGZPMFd12exZ4etUKUq8",
  authDomain: "metromatrix-c44c6.firebaseapp.com",
  projectId: "metromatrix-c44c6",
  storageBucket: "metromatrix-c44c6.firebasestorage.app",
  messagingSenderId: "942315940095",
  appId: "1:942315940095:web:38d64830e5185f390204ca"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { auth };
export default app;