import axios from 'axios';
import { API_URL } from '../network/network';

export interface SendVerificationEmailParams {
  email: string;
  userType?: 'user' | 'provider';
}

export interface VerifyEmailTokenParams {
  token: string;
  userType?: 'user' | 'provider';
}

export interface ResendVerificationEmailParams {
  email: string;
  userType?: 'user' | 'provider';
}

export interface CheckVerificationStatusParams {
  email: string;
  userType?: 'user' | 'provider';
}

// ✅ Base response type from backend (v59 - Updated)
export interface CheckVerificationStatusResponse {
  success: boolean;
  message?: string;
  emailVerified: boolean;
  isVerified: boolean; // Same as emailVerified
  canLogin: boolean; // true for users, false for providers until admin approval
  verificationPending: boolean; // true if email not verified yet
  error?: string; // Error message if verification record not found
  // These are returned when email is verified (FOR USERS ONLY)
  accessToken?: string;
  refreshToken?: string;
  tokenType?: 'LIMITED' | 'FULL'; // Provider token type: LIMITED after email verify, FULL after approval
  user?: any;
  provider?: any;
  onboardingStatus?: 'pending_email' | 'pending_profile' | 'pending_approval' | 'approved' | 'rejected';
}

// ✅ Extended response type with auto-login fields (used internally)
export interface ExtendedVerificationStatusResponse extends CheckVerificationStatusResponse {
  autoLoginUsed?: boolean;
  autoLoginFailed?: boolean;
  autoLoginError?: string;
  noCredentialsForAutoLogin?: boolean;
}

// Send verification email (after signup)
// POST /api/auth/send-verification-email
// 
// ✅ FOR PROVIDERS: Email is verified BEFORE creating provider in database
// Flow: Signup (frontend only) → Verify email → Fill personal info → Submit to admin
// Uses /auth/provider/send-verification-email (creates pending verification record)
// 
// ✅ FOR USERS: Email is verified AFTER creating user in database
// Flow: Signup (creates user) → Verify email → Full access
export const sendVerificationEmailAPI = async (params: SendVerificationEmailParams) => {
  try {
    console.log('📤 Sending verification email to:', params.email);
    
    // Use different endpoint for providers (who don't exist in DB yet)
    const endpoint = params.userType === 'provider' 
      ? 'auth/provider/send-verification-email'
      : 'auth/send-verification-email';
    
    const response = await axios.post(
      `${API_URL}/${endpoint}`,
      {
        email: params.email,
        userType: params.userType || 'user',
      }
    );
    
    console.log('✅ Verification email sent');
    return response.data;
  } catch (error: any) {
    console.error('❌ Send verification email error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error || 
      error.response?.data?.message ||
      'Failed to send verification email'
    );
  }
};

// ✅ UPDATED: Verify email token
// POST /api/auth/verify-email-token
// 
// ✅ FOR PROVIDERS: Just marks email as verified (no provider record exists yet)
// Returns: { success: true, message: "Email verified", emailVerified: true }
// NO tokens or provider data - that comes AFTER admin approval
// 
// ✅ FOR USERS: Marks email as verified and returns authenticated session
// Returns: { success, emailVerified, user, accessToken, refreshToken }
export const verifyEmailTokenAPI = async (params: VerifyEmailTokenParams) => {
  try {
    console.log('📤 Verifying email token');
    
    const response = await axios.post(
      `${API_URL}/auth/verify-email-token`,
      {
        token: params.token,
        userType: params.userType || 'user',
      }
    );
    
    console.log('✅ Email verified successfully');
    console.log('✅ Authenticated tokens received:', {
      hasAccessToken: !!response.data.accessToken,
      hasRefreshToken: !!response.data.refreshToken,
      hasUserData: !!(response.data.user || response.data.provider),
      tokenType: response.data.tokenType || 'FULL', // Default to FULL for users
      onboardingStatus: response.data.onboardingStatus,
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Email verification error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error || 
      error.response?.data?.message ||
      'Email verification failed'
    );
  }
};

// Resend verification email
// POST /api/auth/send-verification-email (for users)
// POST /api/auth/provider/send-verification-email (for providers)
export const resendVerificationEmailAPI = async (params: ResendVerificationEmailParams) => {
  const email = params.email?.trim().toLowerCase();
  const userType = params.userType || 'user';
  
  console.log('📤 Resending verification email to:', email);
  console.log('📤 User type:', userType);
  
  try {
    // Use provider-specific endpoint for providers
    const endpoint = userType === 'provider' 
      ? 'auth/provider/send-verification-email'
      : 'auth/send-verification-email';
    
    console.log('📤 Using endpoint:', endpoint);
    
    const response = await axios.post(
      `${API_URL}/${endpoint}`,
      { email, userType }
    );
    
    console.log('✅ Verification email resent');
    return response.data;
  } catch (error: any) {
    console.error('❌ Resend verification email error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error || 
      error.response?.data?.message ||
      'Failed to resend verification email'
    );
  }
};

// ✅ Check verification status
// POST /api/auth/check-verification-status (for users)
// POST /api/auth/provider/check-verification-status (for providers)
// GET /api/provider/approval-status (fallback for providers)
// 
// Backend checks Provider collection first, then EmailVerification collection
export const checkVerificationStatusAPI = async (params: CheckVerificationStatusParams): Promise<CheckVerificationStatusResponse> => {
  const email = params.email?.trim().toLowerCase();
  const userType = params.userType || 'user';
  
  console.log('📤 Checking verification status:', email);
  console.log('📤 User type:', userType);
  
  // For providers, try the main endpoint first, then fallback
  if (userType === 'provider') {
    // Try provider-specific check-verification-status endpoint
    try {
      console.log('📤 Trying auth/provider/check-verification-status...');
      const response = await axios.post(
        `${API_URL}/auth/provider/check-verification-status`,
        { email, userType: 'provider' }
      );
      
      console.log('✅ Check verification succeeded:', response.data);
      
      if (response.data.provider && response.data.provider.emailVerified === 'active') {
        response.data.emailVerified = true;
        response.data.isVerified = true;
      }
      
      return response.data;
    } catch (error: any) {
      console.log('⚠️ Primary endpoint failed:', error.response?.data?.error || error.message);
      
      // Fallback: Try approval-status endpoint (checks Provider table directly)
      try {
        console.log('📤 Fallback: Trying provider/approval-status...');
        const fallbackResponse = await axios.get(
          `${API_URL}/provider/approval-status?email=${encodeURIComponent(email)}`
        );
        
        console.log('✅ Fallback succeeded:', fallbackResponse.data);
        
        if (fallbackResponse.data.provider) {
          const provider = fallbackResponse.data.provider;
          const isEmailVerified = provider.emailVerified === 'active';
          
          return {
            success: true,
            message: isEmailVerified ? 'Email verified' : 'Email not verified yet',
            emailVerified: isEmailVerified,
            isVerified: isEmailVerified,
            canLogin: provider.adminVerified === 'active',
            verificationPending: !isEmailVerified,
            provider: provider,
          };
        }
      } catch (fallbackError: any) {
        console.log('⚠️ Fallback also failed:', fallbackError.response?.data?.error || fallbackError.message);
      }
      
      // Both failed - throw the original error
      throw new Error(
        error.response?.data?.error || 
        error.response?.data?.message ||
        'Could not check verification status. Please ensure you have signed up first.'
      );
    }
  }
  
  // For regular users
  try {
    const response = await axios.post(
      `${API_URL}/auth/check-verification-status`,
      { email, userType: 'user' }
    );
    
    console.log('✅ User verification status response:', response.data);
    
    if (response.data.user && response.data.user.emailVerified) {
      response.data.emailVerified = true;
      response.data.isVerified = true;
    }
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Check status error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error || 
      error.response?.data?.message ||
      'Failed to check verification status'
    );
  }
};

// ✅ NEW: Programmatic email verification using GET endpoint
// GET /api/verify-email?token=xxx&type=user|provider
// Returns: { success, message, isVerified, user/provider, accessToken, refreshToken }
// This endpoint ensures data is only stored after email verification is complete
export const verifyEmailProgrammaticAPI = async (params: VerifyEmailTokenParams) => {
  try {
    const userType = params.userType || 'user';
    console.log(`📤 Verifying email programmatically (${userType})`);
    console.log(`📤 Token: ${params.token.substring(0, 20)}...`);
    
    const response = await axios.get(
      `${API_URL}/verify-email`,
      {
        params: {
          token: params.token,
          type: userType,
        }
      }
    );
    
    console.log('✅ Email verified successfully via GET endpoint');
    console.log('✅ Authenticated tokens received:', {
      hasAccessToken: !!response.data.accessToken,
      hasRefreshToken: !!response.data.refreshToken,
      hasUserData: !!(response.data.user || response.data.provider),
      userType: response.data.userType,
    });
    
    // For providers, check emailVerified flag
    if (response.data.provider) {
      console.log('🚩 Provider emailVerified:', response.data.provider.emailVerified);
      console.log('🚩 Provider adminVerified:', response.data.provider.adminVerified);
      console.log('🚩 Provider status:', response.data.provider.status);
      
      if (response.data.provider.emailVerified !== 'active') {
        console.warn('⚠️ WARNING: Provider email not marked as active');
        throw new Error('Email verification not confirmed by server');
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Email verification error:', error.response?.data || error.message);
    
    // Provide helpful error messages
    let errorMessage = 'Email verification failed';
    
    if (error.response?.status === 400) {
      errorMessage = error.response.data?.message || 'Invalid verification token';
    } else if (error.response?.status === 404) {
      errorMessage = 'Verification token not found or expired';
    } else if (error.response?.status === 401) {
      errorMessage = 'User not found or already verified';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    throw new Error(errorMessage);
  }
};