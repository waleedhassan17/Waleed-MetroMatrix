// authConfig.ts
// Central configuration for Google and Facebook authentication
// Place this file in: RealProject/networks/authcalls/authConfig.ts

export interface AuthConfig {
  GOOGLE_WEB_CLIENT_ID: string;
  GOOGLE_ANDROID_CLIENT_ID: string;
  GOOGLE_IOS_CLIENT_ID: string;
  FACEBOOK_APP_ID: string;
}

/**
 * ⚠️ IMPORTANT: Replace these values with YOUR MetroMatrix credentials
 * 
 * GOOGLE CREDENTIALS:
 * 1. Go to: https://console.cloud.google.com/
 * 2. Select your project (or create one)
 * 3. Go to: APIs & Services → Credentials
 * 4. Create OAuth 2.0 Client IDs for:
 *    - Web application (for expo-auth-session on web)
 *    - Android (for native Android app)
 *    - iOS (for native iOS app)
 * 
 * FACEBOOK CREDENTIALS:
 * 1. Go to: https://developers.facebook.com/
 * 2. Select your app (or create one)
 * 3. Go to: Settings → Basic
 * 4. Copy your App ID
 */

// 🔴 REPLACE WITH YOUR METROMATRIX CREDENTIALS
export const AUTH_CONFIG: AuthConfig = {
  // Google Web Client ID (for expo-auth-session on web)
  GOOGLE_WEB_CLIENT_ID: '942315940095-t465i8sfr4dc3m685fm9juqm8d4o49c5.apps.googleusercontent.com',
  
  // Google Android Client ID (from google-services.json)
  GOOGLE_ANDROID_CLIENT_ID: '942315940095-a1upulvv9gc7q265d3ce3bcv6t63q111.apps.googleusercontent.com',
  
  // Google iOS Client ID (from GoogleService-Info.plist)
  GOOGLE_IOS_CLIENT_ID: '942315940095-h2cnrp1f9o3gji37a6e988c5upvbqjno.apps.googleusercontent.com',
  
  // Facebook App ID
  FACEBOOK_APP_ID: 'YOUR_FACEBOOK_APP_ID',
};

/**
 * Instructions for MetroMatrix:
 * 
 * 1. Update firebaseConfig.ts with your Firebase credentials
 * 2. Update this file with your Google & Facebook credentials
 * 3. Download google-services.json for Android
 * 4. Download GoogleService-Info.plist for iOS
 * 5. Update app.json with Facebook App ID
 * 6. No code changes needed in signin.tsx or signinSlice.ts!
 */