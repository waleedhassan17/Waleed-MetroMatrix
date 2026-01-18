// authConfig.js
// Central configuration file for all authentication providers
// Replace these values with your actual credentials

export const AUTH_CONFIG = {
  // Google Authentication
  GOOGLE_WEB_CLIENT_ID: '241889899830-0evcou54g4mqqo9i7shvahatfe5r15a1.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: '241889899830-upg3nfjkqp7u6t3vlgb0eq50qc1gl5lv.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: '241889899830-98e4ctinvki8akmb5qtrcnsr02iv8col.apps.googleusercontent.com', // Get this from Google Cloud Console
  
  // Facebook Authentication
  FACEBOOK_APP_ID: '2277966629368711',
  
  // Firebase configuration is in firebaseConfig.js
};

// Instructions for MetroMatrix integration:
// 1. Copy this file to your MetroMatrix project
// 2. Update all credential values above
// 3. Update firebaseConfig.js with your MetroMatrix Firebase credentials
// 4. Update google-services.json for Android
// 5. Update app.json with Facebook App ID
// 6. No code changes needed in LoginScreen.js!