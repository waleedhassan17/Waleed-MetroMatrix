# 📘 Facebook Authentication - Complete Frontend Implementation

## 📋 Table of Contents
1. [Backend Endpoints Available](#backend-endpoints-available)
2. [Facebook App Configuration](#facebook-app-configuration)
3. [Frontend Implementation](#frontend-implementation)
4. [Installation Steps](#installation-steps)
5. [Testing Guide](#testing-guide)

---

## 🔌 Backend Endpoints Available

Your backend already has Facebook authentication set up!

### Endpoints:
1. **POST /api/auth/facebook-login** - Login/Signup combined (recommended)
   - Creates account if doesn't exist
   - Logs in if account exists
   - Requires: `accessToken`, `userType`

2. **POST /api/auth/facebook-signup** - Signup only
   - Only creates new accounts
   - Returns error if account exists
   - Requires: `accessToken`, `userType`

### Backend Configuration (Already Done ✅):
```javascript
// From your .env file
FACEBOOK_APP_ID=896521822898320
FACEBOOK_APP_SECRET=ae6cc50b7f63516861114b7e3b0f7584
```

---

## 📱 Facebook App Configuration

### Step 1: Facebook Developer Console Setup

1. Go to https://developers.facebook.com/apps/896521822898320/
2. Navigate to **Settings > Basic**
3. Add your app domains:
   - `localhost` (for development)
   - `metromatrix-api-2e35f5f074df.herokuapp.com`
   - Your actual domain

### Step 2: Configure OAuth Redirect URIs

Go to **Facebook Login > Settings** and add:

**Web Platform:**
- `http://localhost:19006/` (Expo web dev)
- `https://metromatrix-api-2e35f5f074df.herokuapp.com/`
- Your production URL

**iOS Platform:**
- `fb896521822898320://authorize`

**Android Platform:**
- `fb896521822898320://authorize`

### Step 3: Enable Facebook Login

In **Facebook Login > Settings**:
- ✅ Enable "Client OAuth Login"
- ✅ Enable "Web OAuth Login"
- ✅ Enable "Embedded Browser OAuth Login"

### Step 4: Request Email Permission

In **App Review > Permissions and Features**:
- Request `email` permission
- Request `public_profile` permission

---

## 💻 Frontend Implementation

### Required Packages

```bash
npm install expo-facebook expo-auth-session
```

### Configuration Files

#### 1. app.json
```json
{
  "expo": {
    "facebookScheme": "fb896521822898320",
    "facebookAppId": "896521822898320",
    "facebookDisplayName": "MetroMatrix",
    "ios": {
      "bundleIdentifier": "com.metromatrix.app",
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.metromatrix.app",
      "permissions": [
        "INTERNET"
      ]
    },
    "plugins": [
      [
        "expo-facebook",
        {
          "userTrackingPermission": "This identifier will be used to deliver personalized ads to you."
        }
      ]
    ]
  }
}
```

#### 2. AndroidManifest.xml (android/app/src/main/AndroidManifest.xml)
Add inside `<application>` tag:

```xml
<meta-data 
  android:name="com.facebook.sdk.ApplicationId" 
  android:value="@string/facebook_app_id"/>
<meta-data 
  android:name="com.facebook.sdk.ClientToken" 
  android:value="@string/facebook_client_token"/>

<activity
  android:name="com.facebook.FacebookActivity"
  android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation"
  android:label="@string/app_name" />
```

#### 3. strings.xml (android/app/src/main/res/values/strings.xml)
```xml
<resources>
  <string name="app_name">MetroMatrix</string>
  <string name="facebook_app_id">896521822898320</string>
  <string name="facebook_client_token">YOUR_CLIENT_TOKEN</string>
</resources>
```

#### 4. Info.plist (ios/MetroMatrix/Info.plist)
Add:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fb896521822898320</string>
    </array>
  </dict>
</array>
<key>FacebookAppID</key>
<string>896521822898320</string>
<key>FacebookDisplayName</key>
<string>MetroMatrix</string>
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fbapi</string>
  <string>fb-messenger-share-api</string>
</array>
```

---

## 🔧 Code Implementation

### 1. Create Facebook Authentication Service

**File: `networks/authcalls/facebookAuth.ts`**

```typescript
import * as Facebook from 'expo-facebook';
import { network } from '../network/network';

interface FacebookLoginResponse {
  success: boolean;
  message: string;
  isNewUser: boolean;
  userType: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    profilePhoto?: string;
    phoneNumber: string;
    profileComplete: boolean;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export const initializeFacebook = async (): Promise<void> => {
  try {
    await Facebook.initializeAsync({
      appId: '896521822898320',
    });
    console.log('✅ Facebook SDK initialized');
  } catch (error) {
    console.error('❌ Facebook initialization error:', error);
    throw error;
  }
};

export const facebookLogin = async (
  userType: 'user' | 'provider' = 'user'
): Promise<FacebookLoginResponse> => {
  try {
    console.log('🔵 Starting Facebook login...');

    // Request permissions
    const { type, token } = await Facebook.logInWithReadPermissionsAsync({
      permissions: ['public_profile', 'email'],
    });

    if (type === 'cancel') {
      throw new Error('Facebook login was cancelled');
    }

    if (!token) {
      throw new Error('No token received from Facebook');
    }

    console.log('✅ Facebook token received:', token.substring(0, 20) + '...');

    // Send token to backend
    const response = await network.post<FacebookLoginResponse>(
      '/auth/facebook-login',
      {
        accessToken: token,
        userType,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Facebook login failed');
    }

    console.log('✅ Backend authentication successful');
    return response.data;
  } catch (error: any) {
    console.error('❌ Facebook login error:', error);
    
    if (error.message?.includes('cancelled')) {
      throw new Error('Facebook login was cancelled');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Facebook login failed. Please try again.');
  }
};

export const facebookSignup = async (
  userType: 'user' | 'provider' = 'user'
): Promise<FacebookLoginResponse> => {
  try {
    console.log('🔵 Starting Facebook signup...');

    const { type, token } = await Facebook.logInWithReadPermissionsAsync({
      permissions: ['public_profile', 'email'],
    });

    if (type === 'cancel') {
      throw new Error('Facebook signup was cancelled');
    }

    if (!token) {
      throw new Error('No token received from Facebook');
    }

    console.log('✅ Facebook token received');

    // Send token to backend for signup
    const response = await network.post<FacebookLoginResponse>(
      '/auth/facebook-signup',
      {
        accessToken: token,
        userType,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Facebook signup failed');
    }

    return response.data;
  } catch (error: any) {
    console.error('❌ Facebook signup error:', error);
    
    if (error.response?.status === 409) {
      throw new Error('An account with this email already exists. Please use login instead.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Facebook signup failed. Please try again.');
  }
};
```

### 2. Add Facebook to SignIn Slice

**File: `screens/user-authentication/signin-screen/signinSlice.ts`**

Add this async thunk:

```typescript
import { facebookLogin } from '../../../networks/authcalls/facebookAuth';

// Add to your slice
submitFacebookSignInAsync: create.asyncThunk(
  async (_, { rejectWithValue, dispatch }) => {
    console.log('📤 submitFacebookSignInAsync started');

    try {
      const result = await facebookLogin('user');
      
      console.log('🔥 Facebook sign-in result:', result);

      // Save authentication data
      await saveAuthToStorage(result, 'user');

      return {
        ...result,
        userType: 'user',
      };
    } catch (error: any) {
      console.log('❌ Facebook sign-in error:', error.message);
      return rejectWithValue(error.message || 'Facebook sign-in failed');
    }
  },
  {
    pending: (state) => {
      console.log('⏳ Facebook sign-in pending...');
      state.status = 'loading';
      state.error = '';
    },
    fulfilled: (state, action) => {
      console.log('✅ Facebook sign-in fulfilled');
      state.status = 'idle';
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.error = '';
    },
    rejected: (state, action) => {
      console.log('❌ Facebook sign-in rejected:', action.payload);
      state.status = 'failed';
      state.error = (action.payload as string) || 'Facebook sign-in failed';
    },
  }
),
```

### 3. Add Facebook to SignUp Slice

**File: `screens/user-authentication/signup-screen/signupSlice.ts`**

Add this async thunk:

```typescript
import { facebookSignup } from '../../../networks/authcalls/facebookAuth';

// Add to your slice
submitFacebookSignUpAsync: create.asyncThunk(
  async (_, { rejectWithValue }) => {
    console.log('📤 submitFacebookSignUpAsync started');

    try {
      const result = await facebookSignup('user');
      
      console.log('🔥 Facebook sign-up result:', result);

      // Save temp credentials for auto-login
      await saveData('tempEmail', result.user.email);
      await saveData('tempUserType', 'user');
      
      return {
        ...result,
        requiresEmailVerification: false, // Facebook accounts are pre-verified
      };
    } catch (error: any) {
      console.log('❌ Facebook sign-up error:', error.message);
      return rejectWithValue(error.message || 'Facebook sign-up failed');
    }
  },
  {
    pending: (state) => {
      state.status = 'loading';
      state.error = '';
    },
    fulfilled: (state, action) => {
      state.status = 'idle';
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.error = '';
    },
    rejected: (state, action) => {
      state.status = 'failed';
      state.error = (action.payload as string) || 'Facebook sign-up failed';
    },
  }
),
```

### 4. Update SignIn Screen

**File: `screens/user-authentication/signin-screen/signin.tsx`**

```typescript
import { submitFacebookSignInAsync } from './signinSlice';
import { initializeFacebook } from '../../../networks/authcalls/facebookAuth';

// Add state
const [isFacebookLoading, setIsFacebookLoading] = useState(false);

// Initialize Facebook SDK on mount
useEffect(() => {
  initializeFacebook().catch(error => {
    console.error('Facebook SDK initialization failed:', error);
  });
}, []);

// Add Facebook handler
const handleFacebookSignIn = async () => {
  try {
    setIsFacebookLoading(true);
    console.log('🔘 Facebook Sign-In button pressed');
    
    const result = await dispatch(submitFacebookSignInAsync()).unwrap();
    
    console.log('✅ Facebook sign-in successful:', result);
    
    // Navigate based on profile status
    if (result.user.profileComplete) {
      Alert.alert(
        'Welcome Back!',
        `Signed in as ${result.user.fullName}`,
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserHome' }],
              });
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Complete Your Profile',
        'Please add your phone number to continue',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.navigate('CompleteProfile');
            }
          }
        ]
      );
    }
  } catch (error: any) {
    console.error('❌ Facebook sign-in error:', error);
    Alert.alert(
      'Sign-In Failed',
      error?.message || 'Failed to sign in with Facebook. Please try again.'
    );
  } finally {
    setIsFacebookLoading(false);
  }
};

// Update Facebook button
<TouchableOpacity
  style={[
    styles.socialButton,
    isFacebookLoading && styles.socialButtonLoading
  ]}
  onPress={handleFacebookSignIn}
  disabled={isLoading || isGoogleLoading || isFacebookLoading}
>
  <Ionicons name="logo-facebook" size={20} color="#4267B2" />
  <Text style={styles.socialButtonText}>
    {isFacebookLoading ? 'Signing in...' : 'Facebook'}
  </Text>
</TouchableOpacity>
```

### 5. Update SignUp Screen

**File: `screens/user-authentication/signup-screen/signup.tsx`**

```typescript
import { submitFacebookSignUpAsync } from './signupSlice';
import { initializeFacebook } from '../../../networks/authcalls/facebookAuth';

// Add state
const [isFacebookLoading, setIsFacebookLoading] = useState(false);

// Initialize Facebook SDK
useEffect(() => {
  initializeFacebook().catch(error => {
    console.error('Facebook SDK initialization failed:', error);
  });
}, []);

// Update handleSocialLogin function
const handleSocialLogin = async (provider: 'google' | 'facebook') => {
  if (provider === 'google') {
    handleGoogleSignIn();
  } else if (provider === 'facebook') {
    handleFacebookSignUp();
  }
};

// Add Facebook handler
const handleFacebookSignUp = async () => {
  try {
    setIsFacebookLoading(true);
    console.log('🔘 Facebook Sign-Up button pressed');
    
    const result = await dispatch(submitFacebookSignUpAsync()).unwrap();
    
    console.log('✅ Facebook sign-up successful:', result);
    
    // Navigate based on profile status
    if (result.user.profileComplete) {
      Alert.alert(
        'Account Created!',
        'Your account has been created successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserHome' }],
              });
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Complete Your Profile',
        'Please add your phone number to continue',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.navigate('CompleteProfile');
            }
          }
        ]
      );
    }
  } catch (error: any) {
    console.error('❌ Facebook sign-up error:', error);
    
    // Handle specific errors
    if (error?.message?.includes('already exists')) {
      Alert.alert(
        'Account Exists',
        'An account with this email already exists. Would you like to sign in instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => navigation.navigate('SignIn'),
          },
        ]
      );
    } else {
      Alert.alert(
        'Sign-Up Failed',
        error?.message || 'Failed to sign up with Facebook. Please try again.'
      );
    }
  } finally {
    setIsFacebookLoading(false);
  }
};
```

---

## 📦 Installation Steps

### Step 1: Install Dependencies
```bash
npm install expo-facebook expo-auth-session
```

### Step 2: Update app.json
Add the Facebook configuration shown above.

### Step 3: Rebuild Native Apps
```bash
# For iOS
npx expo prebuild --platform ios
npx expo run:ios

# For Android
npx expo prebuild --platform android
npx expo run:android

# For web (no rebuild needed)
npx expo start --web
```

### Step 4: Add Facebook Auth Service
Create `networks/authcalls/facebookAuth.ts` with the code above.

### Step 5: Update Slices
Add the Facebook async thunks to both signin and signup slices.

### Step 6: Update Screens
Add Facebook handlers to signin.tsx and signup.tsx.

---

## 🧪 Testing Guide

### Test 1: Sign Up with Facebook

1. Click "Facebook" button on Sign Up screen
2. Facebook login popup should appear
3. Sign in with Facebook account
4. Should create new account
5. Should navigate to Complete Profile (if phone number missing)

**Expected Console Logs:**
```
🔘 Facebook Sign-Up button pressed
🔵 Starting Facebook signup...
✅ Facebook token received
✅ Backend authentication successful
✅ Facebook sign-up successful
```

### Test 2: Sign In with Facebook

1. Click "Facebook" button on Sign In screen
2. Should use existing account
3. Should navigate to UserHome (if profile complete)

**Expected Console Logs:**
```
🔘 Facebook Sign-In button pressed
🔵 Starting Facebook login...
✅ Facebook token received
✅ Backend authentication successful
✅ Facebook sign-in successful
```

### Test 3: Handle Existing Account

1. Try to sign up with Facebook using email that already exists
2. Should show error: "Account exists"
3. Should offer to sign in instead

### Test 4: Cancel Facebook Login

1. Click Facebook button
2. Close Facebook popup
3. Should show: "Facebook login was cancelled"

---

## 🔍 Debugging

### Check if Facebook SDK is initialized
```typescript
console.log('Facebook SDK version:', Facebook.Constants.manifest.version);
```

### Check Access Token
```typescript
const { token } = await Facebook.logInWithReadPermissionsAsync({
  permissions: ['public_profile', 'email'],
});
console.log('Token:', token);
```

### Verify Backend Response
```bash
# Test with curl
curl -X POST https://metromatrix-api-2e35f5f074df.herokuapp.com/api/auth/facebook-login \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "YOUR_FACEBOOK_TOKEN",
    "userType": "user"
  }'
```

### Common Issues

**Issue 1: "Invalid OAuth redirect URI"**
**Solution:** Add your app domain to Facebook App Settings

**Issue 2: "Email permission denied"**
**Solution:** Request `email` permission in Facebook App Review

**Issue 3: "Facebook SDK not initialized"**
**Solution:** Call `initializeFacebook()` before login attempt

**Issue 4: "App not found"**
**Solution:** Verify `facebookAppId` in app.json matches your Facebook App ID

---

## 📝 Checklist

### Facebook App Setup:
- [ ] Facebook App created
- [ ] OAuth redirect URIs configured
- [ ] Email permission requested
- [ ] App domains added
- [ ] Facebook Login enabled

### Frontend Setup:
- [ ] `expo-facebook` installed
- [ ] app.json configured
- [ ] facebookAuth.ts created
- [ ] SignIn slice updated
- [ ] SignUp slice updated
- [ ] SignIn screen updated
- [ ] SignUp screen updated

### Testing:
- [ ] Facebook sign-up works
- [ ] Facebook sign-in works
- [ ] Existing account detection works
- [ ] Cancel handling works
- [ ] Profile completion flow works

---

## 🎯 Final Notes

1. **Email Permission:** Facebook requires app review for email permission in production
2. **Test Users:** Use Facebook test users during development
3. **Privacy Policy:** Facebook requires privacy policy URL
4. **Data Deletion:** Implement data deletion callback URL
5. **App Review:** Submit app for review before public release

Your Facebook authentication is now fully implemented! 🎉
