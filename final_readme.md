# MetroMatrix Authentication Module

Multi-platform authentication supporting Email/Password, Google, and Facebook login for Web and Android.

## ✅ Features
- 📧 Email/Password authentication
- 🔐 Google Sign-In (Web + Android Native)
- 👤 Facebook Sign-In (Web + Android Native)
- 🔥 Firebase Authentication integration
- 📱 Platform-specific implementations (Web OAuth + Native SDKs)

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Credentials

#### Update `authConfig.js`:
```javascript
export const AUTH_CONFIG = {
  GOOGLE_WEB_CLIENT_ID: 'your-web-client-id.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: 'your-android-client-id.apps.googleusercontent.com',
  FACEBOOK_APP_ID: 'your-facebook-app-id',
};
```

#### Update `firebaseConfig.js`:
Replace with your Firebase project credentials from Firebase Console.

#### Update `app.json`:
```json
{
  "plugins": [
    [
      "react-native-fbsdk-next",
      {
        "appID": "YOUR_FACEBOOK_APP_ID",
        "clientToken": "YOUR_FACEBOOK_CLIENT_TOKEN",
        "scheme": "fbYOUR_FACEBOOK_APP_ID"
      }
    ]
  ]
}
```

#### Update `google-services.json`:
Download from Firebase Console → Project Settings → Your Android App

---

## 🔧 Platform-Specific Setup

### For Android:

1. **Google Sign-In:**
   - Get SHA-1 certificate: `eas credentials`
   - Add to Firebase Console → Project Settings → Your Android App → Add Fingerprint
   - Download new `google-services.json`

2. **Facebook Sign-In:**
   - Facebook App Dashboard → Settings → Basic → Add Platform → Android
   - Package Name: `com.testing.myapp`
   - Key Hash: Convert your SHA-1 to Facebook key hash
   - Enable Facebook Login in Facebook App Dashboard

3. **Build:**
   ```bash
   eas build --profile development --platform android
   ```

### For Web:

1. **Google Sign-In:**
   - Already configured via `expo-auth-session`
   - Works with Web Client ID

2. **Facebook Sign-In:**
   - Facebook App Dashboard → Settings → Basic → Add Platform → Website
   - Site URL: `http://localhost:19006` (for development)
   - Facebook Login Settings → Valid OAuth Redirect URIs: Add Firebase OAuth URL
   - **IMPORTANT:** Switch Facebook App to **Live Mode** for public access OR keep in Development Mode and only developers/testers can log in

3. **Run:**
   ```bash
   npm start
   ```
   Press `w` for web

---

## 📝 Important Notes

### Facebook Login Permissions:
- **Current scope:** `public_profile` only (works for ANY Facebook user without App Review)
- **Email scope:** Requires Facebook App Review + Business Portfolio (not needed for university projects)
- Users can still authenticate with Facebook using just `public_profile`

### For MetroMatrix Integration:
1. Copy these files to your MetroMatrix project:
   - `authConfig.js`
   - `firebaseConfig.js`
   - `screens/LoginScreen.js`
   - `screens/HomeScreen.js`
   - `google-services.json`

2. Update credentials in:
   - `authConfig.js` (Google + Facebook IDs)
   - `firebaseConfig.js` (Firebase credentials)
   - `app.json` (Facebook App ID + Client Token)
   - `google-services.json` (Android)

3. Install dependencies from `package.json`

4. No code changes needed! 🎉

---

## 🧪 Testing

### Web:
```bash
npm start
# Press 'w' for web
```

### Android:
```bash
eas build --profile development --platform android
# Install APK on device
```

### Test Accounts:
- **Email/Password:** Create new account in app
- **Google:** Use any Google account
- **Facebook:** 
  - Development Mode: Only app developers/testers
  - Live Mode: Any Facebook user

---

## 🐛 Troubleshooting

### Google Sign-In redirects to google.com on Android:
- Check SHA-1 certificate is added to Firebase
- Verify `google-services.json` has correct `certificate_hash`
- Rebuild app after changes

### Facebook Login "Invalid Scopes" error:
- Remove `email` scope or add yourself as app developer
- Switch to `public_profile` only for public access

### Web: react-native-fbsdk-next error:
- Already handled with conditional imports
- FBSDK only loads on native platforms

---

## 📦 File Structure
```
my-app/
├── screens/
│   ├── LoginScreen.js    # Main authentication screen
│   └── HomeScreen.js      # Post-login screen
├── authConfig.js          # Centralized auth credentials
├── firebaseConfig.js      # Firebase configuration
├── google-services.json   # Android Google Services
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── App.js                 # Navigation setup
```

---

## 🎓 University Project Notes

This authentication module is designed for easy integration and demonstration:
- ✅ Works on Web and Android
- ✅ No business verification required for Facebook (using `public_profile`)
- ✅ Clean, modular code for easy transfer to main project
- ✅ All credentials centralized in `authConfig.js`

---

## 📄 License
University Project - MetroMatrix