# iOS Setup Instructions

Since you don't have a Mac/iOS device currently, here's what needs to be done when someone tests on iOS:

## 🍎 Prerequisites
- Mac computer with Xcode installed
- Apple Developer Account (free or paid)
- iOS device or simulator

---

## 📋 Setup Steps for iOS

### 1. Create iOS OAuth Client in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **iOS**
6. Enter:
   - **Name**: MetroMatrix iOS
   - **Bundle ID**: `com.testing.myapp`
7. Click **Create**
8. Copy the **Client ID** (it looks like: `123456-abc.apps.googleusercontent.com`)
9. Copy the **iOS URL scheme** (reversed client ID, like: `com.googleusercontent.apps.123456-abc`)

### 2. Update authConfig.js

Replace the iOS Client ID:
```javascript
GOOGLE_IOS_CLIENT_ID: 'YOUR_ACTUAL_IOS_CLIENT_ID.apps.googleusercontent.com',
```

### 3. Update app.json

Replace the reversed client ID in the iOS URL scheme:
```json
"CFBundleURLSchemes": [
  "com.googleusercontent.apps.YOUR_REVERSED_IOS_CLIENT_ID"
]
```

### 4. Add GoogleService-Info.plist

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings
3. Under **Your apps**, click **Add app** → Select **iOS**
4. Enter Bundle ID: `com.testing.myapp`
5. Download `GoogleService-Info.plist`
6. Place it in the project root directory

### 5. Configure Facebook for iOS

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app → Settings → Basic
3. Click **Add Platform** → Select **iOS**
4. Enter:
   - **Bundle ID**: `com.testing.myapp`
   - **iPhone Store ID**: (leave empty for development)
5. Save changes

### 6. Build and Test

**Using EAS Build:**
```bash
eas build --profile development --platform ios
```

**Or using Expo Dev Client:**
```bash
npm install
npx expo run:ios
```

---

## 🧪 Testing on iOS

Once built, test these scenarios:

1. ✅ **Email/Password Sign-In** - Should work immediately
2. ✅ **Google Sign-In** - Should show account picker
3. ✅ **Facebook Sign-In** - Works with test users or app developers

---

## ⚠️ Common iOS Issues

### Issue: Google Sign-In doesn't work
**Solution:** 
- Verify `GoogleService-Info.plist` is in project root
- Check Bundle ID matches everywhere: `com.testing.myapp`
- Verify iOS Client ID in authConfig.js is correct

### Issue: Facebook Login fails
**Solution:**
- Check Facebook App ID in app.json matches your Facebook app
- Verify Bundle ID is added in Facebook iOS platform settings
- Make sure FB app is in Development Mode and you're added as developer

### Issue: URL scheme conflicts
**Solution:**
- Make sure URL schemes in app.json are unique
- Format should be: `com.googleusercontent.apps.NUMBERS-LETTERS`

---

## 📱 iOS vs Android Differences

| Feature | Android | iOS |
|---------|---------|-----|
| Google Sign-In | Native SDK ✅ | Native SDK ✅ |
| Facebook Login | Native SDK ✅ | Native SDK ✅ |
| Account Picker | Works ✅ | Works ✅ |
| Configuration File | google-services.json | GoogleService-Info.plist |

Both platforms use the **same LoginScreen.js code** - no changes needed! 🎉

---

## 🚀 When You Get Access to Mac/iOS

1. Follow steps 1-6 above
2. Test the build
3. Report any issues
4. Update this document with any additional findings

The code is already iOS-ready, just needs the configuration files! ✨