import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import { 
  authLogin, 
  getUserProfile,
  googleOAuthLogin,
  facebookOAuthLogin 
} from '../../../networks/authcalls/userSignin';
import {
  KeyForStorage,
  saveData,
  saveUserInfo,
} from '../../../utils/storage_utils/storageUtils';

// Admins sign in on their own screen (screens/admin/auth/AdminSignInScreen.tsx),
// reached from "Staff sign-in" below the form. This flow is customers only.

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
  userType: 'user' | null;
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
  userType: null,
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
  userType: 'user',
  userData: User | null
): Promise<boolean> => {
  if (!isValidToken(accessToken)) {
    console.error('❌ Sign-in response had no usable access token');
    return false;
  }

  try {
    const tokenSaved = await saveData(KeyForStorage.accessToken, accessToken);
    if (!tokenSaved) {
      console.error('❌ Failed to save access token');
      return false;
    }
    if (isValidToken(refreshToken)) {
      await saveData(KeyForStorage.refreshToken, refreshToken);
    }
    if (userData) {
      await saveUserInfo(userData);
    }
    await saveData(KeyForStorage.userType, userType);
    await saveData(KeyForStorage.isAuthenticated, true);
    return true;
  } catch (error) {
    console.error('❌ Error saving auth data:', (error as Error)?.message);
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
      state.userType = null;
      state.status = 'idle';
      state.socialLoginStatus = 'idle';
    }),

    // Customer email/password sign-in, with awaited saves.
    submitSignInAsync: create.asyncThunk(
      async (
        { email, password }: SignInPayload,
        { rejectWithValue }
      ) => {
        try {
          const normalizedEmail = email.trim().toLowerCase();
          
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

          const userData = action.payload.data as SignInResponse;
          state.user = userData.user;
          state.accessToken = userData.accessToken || '';
          state.refreshToken = userData.refreshToken || '';
          state.userType = 'user';
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
    selectUserType: (state) => state.userType,
    selectIsAuthenticated: (state) => !!state.accessToken && !!state.user,
    selectUserId: (state) => state.user?.id,
    selectUserFullName: (state) => state.user?.fullName,
    selectIsLoading: (state) => state.status === 'loading' || state.socialLoginStatus === 'loading',
    selectIsFormComplete: (state) =>
      state.email.trim().length > 0 && state.password.trim().length > 0,
    selectIsProfileComplete: (state) => state.user?.profileComplete || false,
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
  selectUserType,
  selectIsAuthenticated,
  selectUserId,
  selectUserFullName,
  selectIsLoading,
  selectIsFormComplete,
  selectIsProfileComplete,
} = signInSlice.selectors;