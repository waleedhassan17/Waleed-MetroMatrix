import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import { 
  authLogin, 
  getUserProfile,
  googleOAuthLogin,
  facebookOAuthLogin 
} from '../../../networks/authcalls/userSignin';
import { adminLoginAPI } from '../../../networks/admin/adminAPIs';
import {
  KeyForStorage,
  saveData,
  saveUserInfo,
} from '../../../utils/storage_utils/storageUtils';

// ✅ Admin emails that should use admin login flow directly
const ADMIN_EMAILS = [
  'waleedhassansfd@gmail.com',
  'admin@mmlocal.dev', // local dev/test admin
  // Add more admin emails here as needed
];

interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  profileComplete?: boolean;
  isVerified?: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface SignInSliceState {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  status: 'idle' | 'loading' | 'failed';
  socialLoginStatus: 'idle' | 'loading' | 'failed';
  accessToken: string;
  refreshToken: string;
  user: User | null;
  admin: AdminUser | null;
  userType: 'user' | 'admin' | null;
}

interface SignInPayload {
  email: string;
  password: string;
}

interface SignInResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  user: User;
}

interface AdminLoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  admin: AdminUser;
}

const initialState: SignInSliceState = {
  email: '',
  password: '',
  showPassword: false,
  error: '',
  status: 'idle',
  socialLoginStatus: 'idle',
  accessToken: '',
  refreshToken: '',
  user: null,
  admin: null,
  userType: null,
};

/**
 * ✅ Helper function to check if email is an admin email
 */
const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

/**
 * ✅ Helper to validate token before saving
 */
const isValidToken = (token: any): boolean => {
  if (!token || token === null || token === undefined) return false;
  if (typeof token !== 'string') return false;
  if (token === 'null' || token === 'undefined' || token.trim() === '') return false;
  if (token.length < 10) return false;
  return true;
};

/**
 * ✅ CRITICAL FIX: Helper function to save auth data with proper awaiting
 */
const saveAuthToStorage = async (
  accessToken: string,
  refreshToken: string | undefined,
  userType: 'user' | 'admin',
  userData: User | AdminUser | null
): Promise<boolean> => {
  console.log('💾 saveAuthToStorage called for userType:', userType);
  
  // Validate token
  if (!isValidToken(accessToken)) {
    console.error('❌ Invalid access token, not saving:', accessToken);
    return false;
  }
  
  try {
    if (userType === 'admin') {
      // ✅ Save admin tokens to admin-specific keys
      const tokenSaved = await saveData(KeyForStorage.adminToken, accessToken);
      if (!tokenSaved) {
        console.error('❌ Failed to save admin token');
        return false;
      }
      console.log('✅ Admin access token saved to adminToken key');
      
      // Save admin refresh token if valid
      if (isValidToken(refreshToken)) {
        await saveData(KeyForStorage.adminRefreshToken, refreshToken);
        console.log('✅ Admin refresh token saved');
      }
      
      // Save admin info - ensure it's properly stringified
      if (userData) {
        // ✅ FIX: Log what we're saving to debug
        console.log('📝 Saving admin userData:', typeof userData, userData);
        
        // ✅ FIX: Ensure we're not double-stringifying
        let adminInfoToSave: string;
        if (typeof userData === 'string') {
          // Already a string, use as-is (might already be JSON)
          adminInfoToSave = userData;
          console.log('ℹ️ userData is already a string');
        } else {
          // Object, need to stringify
          adminInfoToSave = JSON.stringify(userData);
          console.log('ℹ️ Stringified userData:', adminInfoToSave.substring(0, 100));
        }
        
        await saveData(KeyForStorage.adminInfo, adminInfoToSave);
        console.log('✅ Admin info saved to adminInfo key');
      }
    } else {
      // ✅ Save user tokens to user-specific keys
      const tokenSaved = await saveData(KeyForStorage.accessToken, accessToken);
      if (!tokenSaved) {
        console.error('❌ Failed to save access token');
        return false;
      }
      console.log('✅ Access token saved to storage');
      
      // Save refresh token if valid
      if (isValidToken(refreshToken)) {
        await saveData(KeyForStorage.refreshToken, refreshToken);
        console.log('✅ Refresh token saved');
      }
      
      // Save user info
      if (userData) {
        await saveUserInfo(userData);
        console.log('✅ User info saved');
      }
    }
    
    // Save user type
    await saveData(KeyForStorage.userType, userType);
    console.log('✅ User type saved:', userType);
    
    // Save authentication status
    await saveData(KeyForStorage.isAuthenticated, true);
    console.log('✅ Authentication status saved');
    
    console.log('💾 All auth data saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving auth data:', error);
    return false;
  }
};

export const signInSlice = createAppSlice({
  name: 'signIn',
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    setPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.password = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    togglePasswordVisibility: create.reducer((state) => {
      state.showPassword = !state.showPassword;
    }),
    clearError: create.reducer((state) => {
      state.error = '';
    }),
    setAccessToken: create.reducer((state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    }),
    logout: create.reducer((state) => {
      state.email = '';
      state.password = '';
      state.showPassword = false;
      state.error = '';
      state.accessToken = '';
      state.refreshToken = '';
      state.user = null;
      state.admin = null;
      state.userType = null;
      state.status = 'idle';
      state.socialLoginStatus = 'idle';
    }),

    // ✅ FIXED: submitSignInAsync with proper admin detection and awaited saves
    submitSignInAsync: create.asyncThunk(
      async (
        { email, password }: SignInPayload,
        { rejectWithValue }
      ) => {
        console.log('📤 submitSignInAsync started with:', { email });

        try {
          const normalizedEmail = email.trim().toLowerCase();
          
          // ✅ Check if this is an admin email - try admin login FIRST
          if (isAdminEmail(normalizedEmail)) {
            console.log('🔐 Admin email detected, trying admin login first...');
            
            try {
              const adminResult: AdminLoginResponse = await adminLoginAPI(normalizedEmail, password);
              console.log('📥 Admin login successful:', adminResult);
              
              // ✅ CRITICAL FIX: Save to storage BEFORE returning
              const saved = await saveAuthToStorage(
                adminResult.accessToken,
                adminResult.refreshToken,
                'admin',
                adminResult.admin
              );
              
              if (!saved) {
                throw new Error('Failed to save admin authentication data');
              }
              
              return { type: 'admin', data: adminResult };
            } catch (adminError: any) {
              console.log('❌ Admin login failed:', adminError.message);
              // For admin emails, don't fall back to user login
              throw new Error(adminError.message || 'Admin login failed');
            }
          }

          // Regular user login
          console.log('👤 Attempting user login...');
          try {
            const result: SignInResponse = await authLogin({ 
              signInInfo: { email: normalizedEmail, password } 
            });
            console.log('📥 User login successful');
            
            // ✅ CRITICAL FIX: Save to storage BEFORE returning
            const saved = await saveAuthToStorage(
              result.accessToken,
              result.refreshToken,
              'user',
              result.user
            );
            
            if (!saved) {
              throw new Error('Failed to save authentication data');
            }
            
            return { type: 'user', data: result };
          } catch (userError: any) {
            console.log('❌ User login failed:', userError.message);
            throw userError;
          }
        } catch (error: any) {
          console.log('❌ submitSignInAsync caught error:', error.message);
          return rejectWithValue(error.message || 'Sign in failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Sign in pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Sign in fulfilled with type:', action.payload.type);

          state.status = 'idle';
          state.error = '';

          if (action.payload.type === 'user') {
            const userData = action.payload.data as SignInResponse;
            state.user = userData.user;
            state.accessToken = userData.accessToken || '';
            state.refreshToken = userData.refreshToken || '';
            state.userType = 'user';
            state.admin = null;

            // Note: Storage already saved in thunk
            console.log('💾 User data saved (in thunk)');
            console.log('👤 Current user:', state.user?.email);
          } else {
            const adminData = action.payload.data as AdminLoginResponse;
            state.admin = adminData.admin;
            state.accessToken = adminData.accessToken || '';
            state.refreshToken = adminData.refreshToken || '';
            state.userType = 'admin';
            state.user = null;

            // Note: Storage already saved in thunk
            console.log('💾 Admin data saved (in thunk)');
            console.log('👤 Current admin:', state.admin?.email);
          }
        },
        rejected: (state, action) => {
          console.log('❌ Sign in rejected:', action.payload || action.error.message);

          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Sign in failed';

          console.log('Error set in state:', state.error);
        },
      }
    ),

    // ✅ FIXED: Google OAuth Sign In with awaited saves
    submitGoogleSignInAsync: create.asyncThunk(
      async ({ idToken }: { idToken: string }, { rejectWithValue }) => {
        console.log('📤 Google sign in started');

        try {
          const result = await googleOAuthLogin(idToken);
          console.log('📥 Google sign in result:', JSON.stringify(result, null, 2));

          // ✅ CRITICAL FIX: Save to storage BEFORE returning
          if (result.accessToken) {
            const saved = await saveAuthToStorage(
              result.accessToken,
              result.refreshToken,
              'user',
              result.user
            );
            
            if (!saved) {
              throw new Error('Failed to save authentication data');
            }
          }

          return result;
        } catch (error: any) {
          console.log('❌ Google sign in error:', error.message);
          return rejectWithValue(error.message || 'Google sign in failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Google sign in pending...');
          state.socialLoginStatus = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Google sign in fulfilled');

          state.socialLoginStatus = 'idle';
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.userType = 'user';
          state.error = '';

          // Note: Storage already saved in thunk
          console.log('💾 Google user data saved (in thunk)');
        },
        rejected: (state, action) => {
          console.log('❌ Google sign in rejected:', action.payload || action.error.message);

          state.socialLoginStatus = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Google sign in failed';
        },
      }
    ),

    // ✅ FIXED: Facebook OAuth Sign In with awaited saves
    submitFacebookSignInAsync: create.asyncThunk(
      async ({ accessToken }: { accessToken: string }, { rejectWithValue }) => {
        console.log('📤 Facebook sign in started');

        try {
          const result = await facebookOAuthLogin(accessToken);
          console.log('📥 Facebook sign in result:', JSON.stringify(result, null, 2));

          // ✅ CRITICAL FIX: Save to storage BEFORE returning
          if (result.accessToken) {
            const saved = await saveAuthToStorage(
              result.accessToken,
              result.refreshToken,
              'user',
              result.user
            );
            
            if (!saved) {
              throw new Error('Failed to save authentication data');
            }
          }

          return result;
        } catch (error: any) {
          console.log('❌ Facebook sign in error:', error.message);
          return rejectWithValue(error.message || 'Facebook sign in failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Facebook sign in pending...');
          state.socialLoginStatus = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Facebook sign in fulfilled');

          state.socialLoginStatus = 'idle';
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.userType = 'user';
          state.error = '';

          // Note: Storage already saved in thunk
          console.log('💾 Facebook user data saved (in thunk)');
        },
        rejected: (state, action) => {
          console.log('❌ Facebook sign in rejected:', action.payload || action.error.message);

          state.socialLoginStatus = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Facebook sign in failed';
        },
      }
    ),

    // Fetch user profile after login
    fetchUserProfileAsync: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          console.log('📤 Fetching user profile');
          const user = await getUserProfile();
          
          // ✅ Save updated user info
          await saveUserInfo(user);
          
          return user;
        } catch (error: any) {
          console.log('❌ Fetch profile error:', error.message);
          return rejectWithValue(error.message || 'Failed to fetch profile');
        }
      },
      {
        pending: (state) => {
          state.status = 'loading';
        },
        fulfilled: (state, action) => {
          state.status = 'idle';
          state.user = action.payload;
          // Note: Already saved in thunk
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = (action.payload as string) || 'Failed to fetch profile';
        },
      }
    ),
  }),

  selectors: {
    selectEmail: (state) => state.email,
    selectPassword: (state) => state.password,
    selectShowPassword: (state) => state.showPassword,
    selectStatus: (state) => state.status,
    selectSocialLoginStatus: (state) => state.socialLoginStatus,
    selectError: (state) => state.error,
    selectAccessToken: (state) => state.accessToken,
    selectRefreshToken: (state) => state.refreshToken,
    selectUser: (state) => state.user,
    selectAdmin: (state) => state.admin,
    selectUserType: (state) => state.userType,
    selectIsAuthenticated: (state) => !!state.accessToken && (!!state.user || !!state.admin),
    selectUserId: (state) => state.user?.id,
    selectUserFullName: (state) => state.user?.fullName || state.admin?.fullName,
    selectIsLoading: (state) => state.status === 'loading' || state.socialLoginStatus === 'loading',
    selectIsFormComplete: (state) =>
      state.email.trim().length > 0 && state.password.trim().length > 0,
    selectIsProfileComplete: (state) => state.user?.profileComplete || false,
    selectIsAdmin: (state) => state.userType === 'admin',
  },
});

export const {
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearError,
  setAccessToken,
  logout,
  submitSignInAsync,
  submitGoogleSignInAsync,
  submitFacebookSignInAsync,
  fetchUserProfileAsync,
} = signInSlice.actions;

export const {
  selectEmail,
  selectPassword,
  selectShowPassword,
  selectStatus,
  selectSocialLoginStatus,
  selectError,
  selectAccessToken,
  selectRefreshToken,
  selectUser,
  selectAdmin,
  selectUserType,
  selectIsAuthenticated,
  selectUserId,
  selectUserFullName,
  selectIsLoading,
  selectIsFormComplete,
  selectIsProfileComplete,
  selectIsAdmin,
} = signInSlice.selectors;