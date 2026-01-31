import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import { authRegister } from '../../../networks/authcalls/userSignup';
import { sendVerificationEmailAPI } from '../../../networks/authcalls/emailVerification';
import {
  googleSignupAPI,
  facebookSignupAPI,
  convertSocialToUserAuth,
  SocialAuthResponse,
} from '../../../networks/authcalls/socialAuth';
import {
  KeyForStorage,
  saveData,
  saveUserInfo,
} from '../../../utils/storage_utils/storageUtils';

// ✅ FACEBOOK: Import Facebook authentication
import { facebookSignup } from '../../../networks/authcalls/facebookAuth';

// ✅ Admin emails that CANNOT register as regular users
const ADMIN_EMAILS = [
  'waleedhassansfd@gmail.com',
  // Add more admin emails here as needed
];

interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  profileComplete?: boolean;
  isVerified?: boolean;
  emailVerified?: boolean;
}

interface SignUpSliceState {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  status: 'idle' | 'loading' | 'failed';
  socialSignupStatus: 'idle' | 'loading' | 'failed';
  accessToken: string;
  refreshToken: string;
  user: User | null;
  requiresEmailVerification: boolean;
  isNewSocialUser: boolean;
}

interface SignUpPayload {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
}

interface SignUpResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  user: User;
  requiresEmailVerification?: boolean;
}

const initialState: SignUpSliceState = {
  fullName: '',
  phoneNumber: '',
  email: '',
  password: '',
  showPassword: false,
  error: '',
  status: 'idle',
  socialSignupStatus: 'idle',
  accessToken: '',
  refreshToken: '',
  user: null,
  requiresEmailVerification: false,
  isNewSocialUser: false,
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
 * ✅ Helper function to save auth data
 */
const saveAuthToStorage = async (
  accessToken: string,
  refreshToken: string | undefined,
  userData: User | null
): Promise<boolean> => {
  console.log('💾 saveAuthToStorage called for social signup');
  
  if (!isValidToken(accessToken)) {
    console.error('❌ Invalid access token, not saving:', accessToken);
    return false;
  }
  
  try {
    // Save access token
    const tokenSaved = await saveData(KeyForStorage.accessToken, accessToken);
    if (!tokenSaved) {
      console.error('❌ Failed to save access token');
      return false;
    }
    console.log('✅ Access token saved');
    
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
    
    // Save user type
    await saveData(KeyForStorage.userType, 'user');
    console.log('✅ User type saved');
    
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

/**
 * ✅ Helper function to check if email is an admin email
 */
const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

export const signUpSlice = createAppSlice({
  name: 'signUp',
  initialState,
  reducers: (create) => ({
    setFullName: create.reducer((state, action: PayloadAction<string>) => {
      state.fullName = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    setPhoneNumber: create.reducer((state, action: PayloadAction<string>) => {
      state.phoneNumber = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
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
    resetSignUp: create.reducer((state) => {
      state.fullName = '';
      state.phoneNumber = '';
      state.email = '';
      state.password = '';
      state.showPassword = false;
      state.error = '';
      state.status = 'idle';
    }),

    submitSignUpAsync: create.asyncThunk(
      async (
        { fullName, phoneNumber, email, password }: SignUpPayload,
        { rejectWithValue, dispatch }
      ) => {
        console.log('📤 submitSignUpAsync started with:', { email, fullName });

        try {
          const normalizedEmail = email.trim().toLowerCase();
          
          // ✅ BLOCK ADMIN EMAILS FROM REGISTRATION
          if (isAdminEmail(normalizedEmail)) {
            console.log('❌ Admin email detected, blocking registration');
            return rejectWithValue('This email is reserved for administrator use. Please use a different email address.');
          }

          const payload: SignUpPayload = {
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: normalizedEmail,
            password,
          };

          const result: SignUpResponse = await authRegister({ signUpInfo: payload });

          console.log('📥 submitSignUpAsync received result:', JSON.stringify(result, null, 2));

          // ✅ CRITICAL: Use email from backend response (it may be normalized differently)
          const backendEmail = result.user?.email || normalizedEmail;
          console.log('📧 User entered email:', normalizedEmail);
          console.log('📧 Backend saved email:', backendEmail);
          
          if (backendEmail !== normalizedEmail) {
            console.log('⚠️ Email was normalized by backend! Using backend email for verification.');
          }

          // ✅ CRITICAL FIX: Save temp credentials for auto-login after email verification
          // IMPORTANT: Use backendEmail (the email saved in database) not user input
          console.log('💾 Saving temp credentials for auto-login...');
          await saveData('tempEmail', String(backendEmail));
          await saveData('tempPassword', String(password));
          await saveData('tempUserType', 'user');
          console.log('✅ Temp credentials saved with backend email:', backendEmail);

          // ✅ Backend sends verification email automatically
          // No need to call sendVerificationEmailAPI here
          console.log('✅ User registered - verification email sent by backend');
          
          return {
            ...result,
            requiresEmailVerification: true,
            backendEmail: backendEmail,
          };
        } catch (error: any) {
          console.log('❌ submitSignUpAsync caught error:', error.message);
          console.log('❌ Full error details:', JSON.stringify(error, null, 2));
          
          let errorMsg = error.message || 'Sign up failed';
          
          if (error.message && error.message.includes('Invalid response format')) {
            errorMsg = `${error.message}. Check server response at /auth/register endpoint.`;
          }
          
          return rejectWithValue(errorMsg);
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Sign up pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Sign up fulfilled with payload:', JSON.stringify(action.payload, null, 2));

          state.status = 'idle';
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.requiresEmailVerification = action.payload.requiresEmailVerification || false;
          state.error = '';

          // ✅ Note: Temp credentials are saved in the thunk
          // User will be fully authenticated after email verification + auto-login
          console.log('⚠️ User data NOT saved yet - waiting for email verification');
          console.log('📧 Email verification required:', state.requiresEmailVerification);
          console.log('💾 Temp credentials saved for auto-login after verification');
        },
        rejected: (state, action) => {
          console.log('❌ Sign up rejected:', action.payload || action.error.message);

          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Sign up failed';

          console.log('Error set in state:', state.error);
        },
      }
    ),

    // ✅ FACEBOOK: Facebook Sign-Up Async Thunk
    submitFacebookSignUpAsync: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        console.log('📤 submitFacebookSignUpAsync started');

        try {
          // Call Facebook signup service
          const result = await facebookSignup('user');
          
          console.log('🔥 Facebook sign-up result:', {
            success: result.success,
            isNewUser: result.isNewUser,
            email: result.user.email,
            hasToken: !!result.accessToken,
          });

          // Save temp credentials for potential later use
          console.log('💾 Saving temp credentials...');
          await saveData('tempEmail', result.user.email);
          await saveData('tempUserType', 'user');
          console.log('✅ Temp credentials saved');
          
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
          console.log('⏳ Facebook sign-up pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Facebook sign-up fulfilled');
          console.log('👤 New user:', action.payload.user.email);
          
          state.status = 'idle';
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.requiresEmailVerification = false; // Facebook pre-verified
          state.error = '';
          
          console.log('💾 User data saved in state');
          console.log('📧 Email verification NOT required (Facebook account)');
        },
        rejected: (state, action) => {
          console.log('❌ Facebook sign-up rejected:', action.payload);
          state.status = 'failed';
          state.error = (action.payload as string) || 'Facebook sign-up failed';
        },
      }
    ),
  }),

  selectors: {
    selectFullName: (state) => state.fullName,
    selectPhoneNumber: (state) => state.phoneNumber,
    selectEmail: (state) => state.email,
    selectPassword: (state) => state.password,
    selectShowPassword: (state) => state.showPassword,
    selectStatus: (state) => state.status,
    selectSocialSignupStatus: (state) => state.socialSignupStatus,
    selectError: (state) => state.error,
    selectAccessToken: (state) => state.accessToken,
    selectRefreshToken: (state) => state.refreshToken,
    selectUser: (state) => state.user,
    selectIsAuthenticated: (state) => !!state.user && !!state.accessToken,
    selectUserId: (state) => state.user?.id,
    selectUserFullName: (state) => state.user?.fullName,
    selectIsLoading: (state) => state.status === 'loading' || state.socialSignupStatus === 'loading',
    selectIsFormComplete: (state) =>
      state.fullName.trim().length > 0 &&
      state.phoneNumber.trim().length > 0 &&
      state.email.trim().length > 0 &&
      state.password.trim().length > 0,
    selectIsProfileComplete: (state) => state.user?.profileComplete || false,
    selectRequiresEmailVerification: (state) => state.requiresEmailVerification,
    selectIsNewSocialUser: (state) => state.isNewSocialUser,
  },
});

export const {
  setFullName,
  setPhoneNumber,
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearError,
  resetSignUp,
  submitSignUpAsync,
  submitFacebookSignUpAsync, // ✅ FACEBOOK: Export Facebook sign-up action
} = signUpSlice.actions;

export const {
  selectFullName,
  selectPhoneNumber,
  selectEmail,
  selectPassword,
  selectShowPassword,
  selectStatus,
  selectSocialSignupStatus,
  selectError,
  selectAccessToken,
  selectRefreshToken,
  selectUser,
  selectIsAuthenticated,
  selectUserId,
  selectUserFullName,
  selectIsLoading,
  selectIsFormComplete,
  selectIsProfileComplete,
  selectRequiresEmailVerification,
  selectIsNewSocialUser,
} = signUpSlice.selectors;