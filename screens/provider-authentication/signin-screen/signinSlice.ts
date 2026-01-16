import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import { 
  providerAuthLogin,
  providerGoogleOAuthLogin,
  providerFacebookOAuthLogin,
  getProviderVerificationStatus,
  ProviderLoginResponse
} from '../../../networks/authcalls/providerSignin';
import {
  KeyForStorage,
  saveData,
  saveUserInfo,
} from '../../../utils/storage_utils/storageUtils';

interface Provider {
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
  verificationStatus?: string;
  onboardingStatus?: 'pending_email' | 'pending_profile' | 'pending_approval' | 'approved' | 'rejected';
}

interface ProviderSignInSliceState {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  status: 'idle' | 'loading' | 'failed';
  socialLoginStatus: 'idle' | 'loading' | 'failed';
  accessToken: string;
  refreshToken: string;
  tokenType: 'LIMITED' | 'FULL' | null; // Token type for provider two-tier auth
  provider: Provider | null;
  isNotApproved: boolean; // Flag to show specific UI for non-approved providers
  onboardingStatus: string | null; // Current onboarding status from error
}

interface SignInPayload {
  email: string;
  password: string;
}

interface SignInResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  tokenType?: 'LIMITED' | 'FULL';
  onboardingStatus?: string;
  provider: Provider;
}

const initialState: ProviderSignInSliceState = {
  email: '',
  password: '',
  showPassword: false,
  error: '',
  status: 'idle',
  socialLoginStatus: 'idle',
  accessToken: '',
  refreshToken: '',
  tokenType: null,
  provider: null,
  isNotApproved: false,
  onboardingStatus: null,
};

export const providerSignInSlice = createAppSlice({
  name: 'providerSignIn',
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
      if (state.error) {
        state.error = '';
        state.isNotApproved = false;
        state.onboardingStatus = null;
      }
    }),
    setPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.password = action.payload;
      if (state.error) {
        state.error = '';
        state.isNotApproved = false;
        state.onboardingStatus = null;
      }
    }),
    togglePasswordVisibility: create.reducer((state) => {
      state.showPassword = !state.showPassword;
    }),
    clearError: create.reducer((state) => {
      state.error = '';
      state.isNotApproved = false;
      state.onboardingStatus = null;
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
      state.tokenType = null;
      state.provider = null;
      state.status = 'idle';
      state.socialLoginStatus = 'idle';
      state.isNotApproved = false;
      state.onboardingStatus = null;
    }),

    // Submit Provider Sign In (Regular sign-in from screen)
    submitProviderSignInAsync: create.asyncThunk(
      async (
        { email, password }: SignInPayload,
        { rejectWithValue }
      ) => {
        console.log('📤 submitProviderSignInAsync started with:', { email });

        try {
          const payload: SignInPayload = {
            email: email.trim(),
            password,
          };

          const result = await providerAuthLogin(payload);

          console.log('📥 submitProviderSignInAsync received result:', JSON.stringify(result, null, 2));

          return result as SignInResponse;
        } catch (error: any) {
          console.log('❌ submitProviderSignInAsync caught error:', error.message);
          console.log('❌ Not approved:', error.isNotApproved);
          console.log('❌ Onboarding status:', error.onboardingStatus);
          
          // Include additional error context for the rejected handler
          return rejectWithValue({
            message: error.message || 'Provider sign in failed',
            isNotApproved: error.isNotApproved || false,
            onboardingStatus: error.onboardingStatus || null,
          });
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Provider sign in pending...');
          state.status = 'loading';
          state.error = '';
          state.isNotApproved = false;
          state.onboardingStatus = null;
        },
        fulfilled: (state, action) => {
          console.log('✅ Provider sign in fulfilled with payload:', JSON.stringify(action.payload, null, 2));

          state.status = 'idle';
          state.provider = action.payload.provider;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.tokenType = action.payload.tokenType || 'FULL';
          state.error = '';
          state.isNotApproved = false;
          state.onboardingStatus = action.payload.onboardingStatus || null;

          // Save tokens and provider info to storage
          saveData(KeyForStorage.accessToken, action.payload.accessToken);
          saveData(KeyForStorage.tokenType, action.payload.tokenType || 'FULL');
          if (action.payload.refreshToken) {
            saveData(KeyForStorage.refreshToken, action.payload.refreshToken);
          }
          if (action.payload.provider) {
            saveUserInfo(action.payload.provider);
            saveData(KeyForStorage.userType, 'provider');
            saveData(KeyForStorage.isAuthenticated, true);
            if (action.payload.onboardingStatus) {
              saveData(KeyForStorage.providerApprovalStatus, action.payload.onboardingStatus);
            }
          }

          console.log('💾 Provider data saved to storage');
          console.log('👤 Current provider:', state.provider?.email);
          console.log('📊 Token type:', state.tokenType);
        },
        rejected: (state, action) => {
          console.log('❌ Provider sign in rejected:', action.payload || action.error.message);

          state.status = 'failed';
          
          // Handle error with additional context
          const errorPayload = action.payload as { message: string; isNotApproved?: boolean; onboardingStatus?: string };
          if (typeof errorPayload === 'object' && errorPayload !== null) {
            state.error = errorPayload.message || 'Provider sign in failed';
            state.isNotApproved = errorPayload.isNotApproved || false;
            state.onboardingStatus = errorPayload.onboardingStatus || null;
          } else {
            state.error = (action.payload as string) || action.error.message || 'Provider sign in failed';
          }

          console.log('Error set in state:', state.error);
          console.log('Is not approved:', state.isNotApproved);
          console.log('Onboarding status:', state.onboardingStatus);
        },
      }
    ),

    // Provider Sign In With Password (For auto sign-in after email verification)
    providerSignInWithPasswordAsync: create.asyncThunk(
      async (
        { email, password }: SignInPayload,
        { rejectWithValue }
      ) => {
        console.log('📤 providerSignInWithPasswordAsync (auto sign-in) started with:', { email });

        try {
          const payload: SignInPayload = {
            email: email.trim(),
            password,
          };

          const result: SignInResponse = await providerAuthLogin(payload);

          console.log('📥 providerSignInWithPasswordAsync received result:', JSON.stringify(result, null, 2));

          return result;
        } catch (error: any) {
          console.log('❌ providerSignInWithPasswordAsync caught error:', error.message);
          return rejectWithValue(error.message || 'Auto sign-in failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Auto sign-in pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Auto sign-in fulfilled with payload:', JSON.stringify(action.payload, null, 2));

          state.status = 'idle';
          state.provider = action.payload.provider;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.error = '';

          // Save authenticated tokens and provider info
          saveData(KeyForStorage.accessToken, action.payload.accessToken);
          if (action.payload.refreshToken) {
            saveData(KeyForStorage.refreshToken, action.payload.refreshToken);
          }
          if (action.payload.provider) {
            saveUserInfo(action.payload.provider);
            saveData(KeyForStorage.userType, 'provider');
            saveData(KeyForStorage.isAuthenticated, true);
          }

          console.log('💾 Auto sign-in: Provider authenticated and data saved');
          console.log('✅ Provider can now upload files');
        },
        rejected: (state, action) => {
          console.log('❌ Auto sign-in rejected:', action.payload || action.error.message);

          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Auto sign-in failed';

          console.log('Error set in state:', state.error);
        },
      }
    ),

    // Google OAuth Sign In
    submitProviderGoogleSignInAsync: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        console.log('📤 Provider Google sign in started');

        try {
          const result = await providerGoogleOAuthLogin();
          console.log('📥 Provider Google sign in result:', JSON.stringify(result, null, 2));

          return result;
        } catch (error: any) {
          console.log('❌ Provider Google sign in error:', error.message);
          return rejectWithValue(error.message || 'Provider Google sign in failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Provider Google sign in pending...');
          state.socialLoginStatus = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Provider Google sign in fulfilled');

          state.socialLoginStatus = 'idle';
          state.provider = action.payload.provider;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.error = '';

          // Save tokens and provider info to storage
          saveData(KeyForStorage.accessToken, action.payload.accessToken);
          if (action.payload.refreshToken) {
            saveData(KeyForStorage.refreshToken, action.payload.refreshToken);
          }
          if (action.payload.provider) {
            saveUserInfo(action.payload.provider);
            saveData(KeyForStorage.userType, 'provider');
            saveData(KeyForStorage.isAuthenticated, true);
          }

          console.log('💾 Provider Google user data saved to storage');
        },
        rejected: (state, action) => {
          console.log('❌ Provider Google sign in rejected:', action.payload || action.error.message);

          state.socialLoginStatus = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Provider Google sign in failed';
        },
      }
    ),

    // Facebook OAuth Sign In
    submitProviderFacebookSignInAsync: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        console.log('📤 Provider Facebook sign in started');

        try {
          const result = await providerFacebookOAuthLogin();
          console.log('📥 Provider Facebook sign in result:', JSON.stringify(result, null, 2));

          return result;
        } catch (error: any) {
          console.log('❌ Provider Facebook sign in error:', error.message);
          return rejectWithValue(error.message || 'Provider Facebook sign in failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Provider Facebook sign in pending...');
          state.socialLoginStatus = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Provider Facebook sign in fulfilled');

          state.socialLoginStatus = 'idle';
          state.provider = action.payload.provider;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.error = '';

          // Save tokens and provider info to storage
          saveData(KeyForStorage.accessToken, action.payload.accessToken);
          if (action.payload.refreshToken) {
            saveData(KeyForStorage.refreshToken, action.payload.refreshToken);
          }
          if (action.payload.provider) {
            saveUserInfo(action.payload.provider);
            saveData(KeyForStorage.userType, 'provider');
            saveData(KeyForStorage.isAuthenticated, true);
          }

          console.log('💾 Provider Facebook user data saved to storage');
        },
        rejected: (state, action) => {
          console.log('❌ Provider Facebook sign in rejected:', action.payload || action.error.message);

          state.socialLoginStatus = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Provider Facebook sign in failed';
        },
      }
    ),

    // Fetch Provider Verification
    fetchProviderVerificationAsync: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          console.log('📤 Fetching provider verification status');
          const verificationData = await getProviderVerificationStatus();
          return verificationData;
        } catch (error: any) {
          console.log('❌ Fetch verification status error:', error.message);
          return rejectWithValue(error.message || 'Failed to fetch verification status');
        }
      },
      {
        pending: (state) => {
          state.status = 'loading';
        },
        fulfilled: (state, action) => {
          state.status = 'idle';
          if (state.provider) {
            state.provider.isVerified = action.payload.isVerified;
            state.provider.verificationStatus = action.payload.verificationStatus;
            saveUserInfo(state.provider);
          }
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = (action.payload as string) || 'Failed to fetch verification status';
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
    selectTokenType: (state) => state.tokenType,
    selectProvider: (state) => state.provider,
    selectIsAuthenticated: (state) => !!state.provider && !!state.accessToken,
    selectProviderId: (state) => state.provider?.id,
    selectProviderFullName: (state) => state.provider?.fullName,
    selectIsLoading: (state) => 
      state.status === 'loading' || state.socialLoginStatus === 'loading',
    selectIsFormComplete: (state) =>
      state.email.trim().length > 0 && state.password.trim().length > 0,
    selectIsProfileComplete: (state) => state.provider?.profileComplete || false,
    selectIsVerified: (state) => state.provider?.isVerified || false,
    selectVerificationStatus: (state) => state.provider?.verificationStatus,
    selectIsNotApproved: (state) => state.isNotApproved,
    selectOnboardingStatus: (state) => state.onboardingStatus,
  },
});

// Export actions
export const {
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearError,
  setAccessToken,
  logout,
  submitProviderSignInAsync,
  providerSignInWithPasswordAsync,
  submitProviderGoogleSignInAsync,
  submitProviderFacebookSignInAsync,
  fetchProviderVerificationAsync,
} = providerSignInSlice.actions;

// Export selectors
export const {
  selectEmail,
  selectPassword,
  selectShowPassword,
  selectStatus,
  selectSocialLoginStatus,
  selectError,
  selectAccessToken,
  selectRefreshToken,
  selectTokenType,
  selectProvider,
  selectIsAuthenticated,
  selectProviderId,
  selectProviderFullName,
  selectIsLoading,
  selectIsFormComplete,
  selectIsProfileComplete,
  selectIsVerified,
  selectVerificationStatus,
  selectIsNotApproved,
  selectOnboardingStatus,
} = providerSignInSlice.selectors;