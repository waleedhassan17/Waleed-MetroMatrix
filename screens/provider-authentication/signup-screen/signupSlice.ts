import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import {
  providerAuthRegister,
  checkProviderEmailAvailability
} from '../../../networks/authcalls/providerSignup';
import { sendVerificationEmailAPI } from '../../../networks/authcalls/emailVerification';
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
  // NEW v64 fields
  emailVerified?: 'pending' | 'active' | 'inactive';
  adminVerified?: 'pending' | 'active' | 'inactive';
  status?: string;
  onboardingStatus?: string;
}

interface ProviderSignUpSliceState {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  error: string;
  status: 'idle' | 'loading' | 'failed';
  emailCheckStatus: 'idle' | 'checking' | 'available' | 'unavailable';
  accessToken: string;
  refreshToken: string;
  provider: Provider | null;
  registrationComplete: boolean;
  requiresEmailVerification: boolean;
}

interface SignUpPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

interface SignUpResponse {
  success: boolean;
  message?: string; // NEW v64 - backend returns message
  accessToken?: string; // Optional - not returned during registration
  refreshToken?: string;
  provider: Provider;
  requiresEmailVerification?: boolean;
  emailSent?: boolean; // NEW - indicates if verification email was sent
}

const initialState: ProviderSignUpSliceState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  showPassword: false,
  showConfirmPassword: false,
  error: '',
  status: 'idle',
  emailCheckStatus: 'idle',
  accessToken: '',
  refreshToken: '',
  provider: null,
  registrationComplete: false,
  requiresEmailVerification: false,
};

export const providerSignUpSlice = createAppSlice({
  name: 'providerSignUp',
  initialState,
  reducers: (create) => ({
    setFullName: create.reducer((state, action: PayloadAction<string>) => {
      state.fullName = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
      if (state.error) {
        state.error = '';
      }
      state.emailCheckStatus = 'idle';
    }),
    setPhoneNumber: create.reducer((state, action: PayloadAction<string>) => {
      state.phoneNumber = action.payload;
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
    setConfirmPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.confirmPassword = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    togglePasswordVisibility: create.reducer((state) => {
      state.showPassword = !state.showPassword;
    }),
    toggleConfirmPasswordVisibility: create.reducer((state) => {
      state.showConfirmPassword = !state.showConfirmPassword;
    }),
    clearError: create.reducer((state) => {
      state.error = '';
    }),
    setRegistrationComplete: create.reducer((state, action: PayloadAction<boolean>) => {
      state.registrationComplete = action.payload;
    }),
    resetSignUpState: create.reducer((state) => {
      state.fullName = '';
      state.email = '';
      state.phoneNumber = '';
      state.password = '';
      state.confirmPassword = '';
      state.showPassword = false;
      state.showConfirmPassword = false;
      state.error = '';
      state.accessToken = '';
      state.refreshToken = '';
      state.provider = null;
      state.status = 'idle';
      state.emailCheckStatus = 'idle';
      state.registrationComplete = false;
      state.requiresEmailVerification = false;
    }),

    /**
     * ✅ UPDATED: Provider Sign Up - Create in Backend (Similar to User Flow)
     * 
     * NEW Flow:
     * 1. Create provider in backend with flags: emailVerified=false, isApproved=false
     * 2. Backend sends verification email automatically
     * 3. Save temp credentials for email verification
     * 4. Navigate to email verification screen
     * 5. After email verification → Navigate to PersonalInfo
     * 6. After PersonalInfo submission → Submit to admin for approval
     * 7. Navigate to Waiting Screen
     * 8. Admin approves → Provider can login
     */
    submitProviderSignUpAsync: create.asyncThunk(
      async (
        { fullName, email, phoneNumber, password }: SignUpPayload,
        { rejectWithValue }
      ) => {
        console.log('📤 submitProviderSignUpAsync started');
        console.log('📧 Email:', email);

        try {
          const normalizedEmail = email.trim().toLowerCase();
          
          const payload: SignUpPayload = {
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: normalizedEmail,
            password,
          };

          // ✅ Create provider in backend with unverified flags
          console.log('📤 Creating provider account in backend...');
          console.log('📧 Email:', normalizedEmail);
          console.log('📱 Phone:', phoneNumber);
          console.log('👤 Name:', fullName);
          
          const result: SignUpResponse = await providerAuthRegister(payload);
          
          console.log('✅ Provider created in backend successfully!');
          console.log('📊 Response:', result);
          console.log('📊 Provider:', result.provider);
          console.log('📊 Message:', result.message);
          console.log('📊 Email Verified:', result.provider?.emailVerified); // Should be 'pending'
          console.log('📊 Admin Verified:', result.provider?.adminVerified); // Should be 'pending'
          console.log('📊 Status:', result.provider?.status); // Should be 'pending_email_verification'
          console.log('📧 Email sent by backend:', result.emailSent);
          console.log('⚠️ NO TOKENS returned - provider must verify email first');

          // ✅ CRITICAL: Use email from backend response (it may be normalized differently)
          const backendEmail = result.provider?.email || normalizedEmail;
          console.log('📧 User entered email:', normalizedEmail);
          console.log('📧 Backend saved email:', backendEmail);
          
          if (backendEmail !== normalizedEmail) {
            console.log('⚠️ Email was normalized by backend! Using backend email for verification.');
          }

          // ✅ Save the email for the verification flow.
          // The raw password is deliberately NOT persisted: device storage is
          // not a safe place for a plaintext credential, and it isn't needed —
          // after the emailed link is opened, the backend's /verify-email page
          // deep-links back into the app with real access/refresh tokens
          // (see screens/verify-success), which is what signs the user in.
          console.log('💾 Saving verification email...');
          await saveData('tempEmail', String(backendEmail));
          await saveData('tempUserType', 'provider');
          await saveData(KeyForStorage.providerTempEmail, backendEmail);
          console.log('✅ Verification email saved with backend email:', backendEmail);
            
          return {
            ...result,
            requiresEmailVerification: true,
            emailSent: result.emailSent ?? true, // Track if email was sent
            // Pass the backend email so navigation uses the correct one
            backendEmail: backendEmail,
          };
          
        } catch (error: any) {
          console.log('❌ submitProviderSignUpAsync caught error:', error.message);
          return rejectWithValue(error.message || 'Provider sign up failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Provider sign up pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Provider sign up fulfilled');

          state.status = 'idle';
          state.provider = action.payload.provider;
          state.accessToken = action.payload.accessToken || '';
          state.refreshToken = action.payload.refreshToken || '';
          state.requiresEmailVerification = action.payload.requiresEmailVerification || false;
          state.error = '';
          state.registrationComplete = false;

          // ✅ Provider created in backend with emailVerified=false, isApproved=false
          console.log('✅ Provider created in backend - waiting for email verification');
          console.log('📧 Email verification required:', state.requiresEmailVerification);
          console.log('📧 Email was sent:', action.payload.emailSent);
        },
        rejected: (state, action) => {
          console.log('❌ Provider sign up rejected:', action.payload || action.error.message);

          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Provider sign up failed';
        },
      }
    ),

    // Check Email Availability
    checkProviderEmailAsync: create.asyncThunk(
      async (email: string, { rejectWithValue }) => {
        console.log('📤 Checking provider email availability:', email);

        try {
          const result = await checkProviderEmailAvailability(email);
          console.log('📥 Email availability result:', result);

          return result;
        } catch (error: any) {
          console.log('❌ Email check error:', error.message);
          return rejectWithValue(error.message || 'Failed to check email');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Email availability check pending...');
          state.emailCheckStatus = 'checking';
        },
        fulfilled: (state, action) => {
          console.log('✅ Email availability check fulfilled');

          if (action.payload.available) {
            state.emailCheckStatus = 'available';
          } else {
            state.emailCheckStatus = 'unavailable';
            state.error = 'An account with this email already exists';
          }
        },
        rejected: (state) => {
          console.log('❌ Email availability check failed');
          state.emailCheckStatus = 'idle';
        },
      }
    ),

  }),

  selectors: {
    selectFullName: (state) => state.fullName,
    selectEmail: (state) => state.email,
    selectPhoneNumber: (state) => state.phoneNumber,
    selectPassword: (state) => state.password,
    selectConfirmPassword: (state) => state.confirmPassword,
    selectShowPassword: (state) => state.showPassword,
    selectShowConfirmPassword: (state) => state.showConfirmPassword,
    selectStatus: (state) => state.status,
    selectEmailCheckStatus: (state) => state.emailCheckStatus,
    selectError: (state) => state.error,
    selectAccessToken: (state) => state.accessToken,
    selectRefreshToken: (state) => state.refreshToken,
    selectProvider: (state) => state.provider,
    selectRegistrationComplete: (state) => state.registrationComplete,
    selectRequiresEmailVerification: (state) => state.requiresEmailVerification,
    selectIsLoading: (state) => state.status === 'loading',
    selectIsFormComplete: (state) =>
      state.fullName.trim().length > 0 &&
      state.email.trim().length > 0 &&
      state.phoneNumber.trim().length > 0 &&
      state.password.trim().length > 0,
    selectPasswordsMatch: (state) => 
      state.password === state.confirmPassword && state.password.length > 0,
    selectIsEmailAvailable: (state) => state.emailCheckStatus === 'available',
    selectIsCheckingEmail: (state) => state.emailCheckStatus === 'checking',
    selectIsSignUpSuccessful: (state) => !!state.provider && !!state.accessToken,
    selectProviderId: (state) => state.provider?.id,
    selectProviderEmail: (state) => state.provider?.email,
    selectProviderFullName: (state) => state.provider?.fullName,
  },
});

export const {
  setFullName,
  setEmail,
  setPhoneNumber,
  setPassword,
  setConfirmPassword,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  clearError,
  setRegistrationComplete,
  resetSignUpState,
  submitProviderSignUpAsync,
  checkProviderEmailAsync,
} = providerSignUpSlice.actions;

export const {
  selectFullName,
  selectEmail,
  selectPhoneNumber,
  selectPassword,
  selectConfirmPassword,
  selectShowPassword,
  selectShowConfirmPassword,
  selectStatus,
  selectEmailCheckStatus,
  selectError,
  selectAccessToken,
  selectRefreshToken,
  selectProvider,
  selectRegistrationComplete,
  selectRequiresEmailVerification,
  selectIsLoading,
  selectIsFormComplete,
  selectPasswordsMatch,
  selectIsEmailAvailable,
  selectIsCheckingEmail,
  selectIsSignUpSuccessful,
  selectProviderId,
  selectProviderEmail,
  selectProviderFullName,
} = providerSignUpSlice.selectors;