import { API } from "../network/network";
import { retriveData, KeyForStorage } from "../../utils/storage_utils/storageUtils";

// Response interface for provider login
export interface ProviderLoginResponse {
  success: boolean;
  provider: any;
  accessToken: string;
  refreshToken?: string;
  tokenType?: 'LIMITED' | 'FULL'; // LIMITED = pending approval, FULL = approved
  onboardingStatus?: 'pending_email' | 'pending_profile' | 'pending_approval' | 'approved' | 'rejected';
}

// Error response types for provider login
export interface ProviderLoginError {
  message: string;
  code?: string;
  onboardingStatus?: string;
  isNotApproved?: boolean;
}

/**
 * Provider Sign In (Login)
 * POST /auth/provider/login
 * 
 * ✅ Important: This endpoint only works for APPROVED providers
 * - Returns FULL token for approved providers
 * - Returns error for pending_email, pending_profile, pending_approval, or rejected providers
 */
export const providerAuthLogin = async (signInInfo: { email: string; password: string }): Promise<ProviderLoginResponse> => {
  try {
    const { email, password } = signInInfo;

    console.log('📤 Attempting provider login for:', email);

    const response = await API.POST({
      URL: "auth/provider/login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
        password: password,
      },
    });

    console.log('✅ Provider login successful:', response.data);
    console.log('📊 Token type:', response.data.tokenType || 'FULL');
    console.log('📊 Onboarding status:', response.data.onboardingStatus);

    return {
      success: response.data.success,
      provider: response.data.provider,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      tokenType: response.data.tokenType || 'FULL',
      onboardingStatus: response.data.onboardingStatus,
    };
  } catch (e: any) {
    console.error("❌ Provider login error:", e);
    console.error("❌ Error response:", e.response?.data);
    
    // Check error type and provide appropriate message
    const errorData = e.response?.data;
    const errorCode = errorData?.error;
    const emailVerified = errorData?.emailVerified;
    const adminVerified = errorData?.adminVerified;
    const status = errorData?.status;
    const onboardingStatus = errorData?.onboardingStatus;
    
    console.log('❌ Login error details:', {
      errorCode,
      emailVerified,
      adminVerified,
      status,
      onboardingStatus,
    });
    
    // Create descriptive error messages based on error codes (v64 API)
    let errorMessage = errorData?.message || errorData?.error || e.message || "Invalid email or password";
    
    // Check if the account is approved (should not show error)
    if (adminVerified === 'active' || onboardingStatus === 'approved') {
      // This should not happen - if approved, login should succeed
      // Log this for debugging
      console.log('⚠️ Approved provider login failed - check backend response');
    }
    
    if (errorCode === 'EMAIL_NOT_VERIFIED' || emailVerified === 'pending') {
      errorMessage = "Please verify your email before logging in. Check your inbox for the verification link.";
    } else if (errorCode === 'ACCOUNT_NOT_APPROVED' || adminVerified === 'pending') {
      errorMessage = "Your account is pending admin approval. You will receive an email once approved.";
    } else if (errorCode === 'ACCOUNT_REJECTED' || (adminVerified === 'inactive' && onboardingStatus !== 'approved')) {
      const rejectionReason = errorData?.rejectionReason;
      errorMessage = rejectionReason 
        ? `Your application was not approved. Reason: ${rejectionReason}`
        : "Your application was not approved. Please contact support for details.";
    } else if (errorCode === 'INVALID_CREDENTIALS') {
      errorMessage = "Invalid email or password.";
    }
    
    // Backward compatibility with old onboarding statuses
    if (!errorCode && onboardingStatus) {
      if (onboardingStatus === 'pending_email' || onboardingStatus === 'pending_email_verification') {
        errorMessage = "Please verify your email before logging in.";
      } else if (onboardingStatus === 'pending_profile' || onboardingStatus === 'pending_documents') {
        errorMessage = "Please complete your profile before logging in.";
      } else if (onboardingStatus === 'pending_approval') {
        errorMessage = "Your account is pending admin approval. Please wait for approval.";
      } else if (onboardingStatus === 'rejected') {
        errorMessage = "Your account was rejected. Please contact support or resubmit your profile.";
      }
    }
    
    // Create error with additional context
    const error = new Error(errorMessage) as any;
    error.errorCode = errorCode;
    error.emailVerified = emailVerified;
    error.adminVerified = adminVerified;
    error.status = status;
    error.onboardingStatus = onboardingStatus;
    // Only mark as not approved if actually pending/inactive and NOT approved
    error.isNotApproved = (adminVerified === 'pending' || 
                          (adminVerified === 'inactive' && onboardingStatus !== 'approved')) || 
                         ['pending_email', 'pending_profile', 'pending_approval', 'rejected'].includes(onboardingStatus);
    
    throw error;
  }
};

/**
 * Provider Logout
 * POST /auth/logout
 */
export const providerAuthLogout = async () => {
  try {
    const token = await retriveData(KeyForStorage.accessToken);

    console.log('📤 Attempting provider logout');

    const response = await API.POST({
      URL: "auth/logout",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {},
    });

    console.log('✅ Provider logout successful');

    return response.data;
  } catch (e: any) {
    console.error("❌ Provider logout error:", e);
    return { success: false, message: e.message };
  }
};

/**
 * Provider Google OAuth Sign In
 * GET /auth/google?type=provider
 */
export const providerGoogleOAuthLogin = async () => {
  try {
    console.log('📤 Initiating Google OAuth for provider');

    const response = await API.GET({
      URL: "auth/google",
      params: {
        type: 'provider'
      },
    });

    return response.data;
  } catch (e: any) {
    console.error("❌ Provider Google OAuth error:", e);
    throw new Error(e.response?.data?.message || e.message || "Google sign-in failed");
  }
};

/**
 * Provider Facebook OAuth Sign In
 * GET /auth/facebook?type=provider
 */
export const providerFacebookOAuthLogin = async () => {
  try {
    console.log('📤 Initiating Facebook OAuth for provider');

    const response = await API.GET({
      URL: "auth/facebook",
      params: {
        type: 'provider'
      },
    });

    return response.data;
  } catch (e: any) {
    console.error("❌ Provider Facebook OAuth error:", e);
    throw new Error(e.response?.data?.message || e.message || "Facebook sign-in failed");
  }
};

/**
 * Refresh Access Token
 * POST /auth/refresh
 */
export const providerRefreshAccessToken = async (refreshToken: string) => {
  try {
    console.log('📤 Refreshing provider access token');

    const response = await API.POST({
      URL: "auth/refresh",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    console.log('✅ Provider token refreshed successfully');

    return {
      success: response.data.success,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  } catch (e: any) {
    console.error("❌ Provider token refresh error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to refresh token");
  }
};

/**
 * Get Provider Verification Status
 * GET /providers/verification
 */
export const getProviderVerificationStatus = async () => {
  try {
    const token = await retriveData(KeyForStorage.accessToken);

    console.log('📤 Fetching provider verification status');

    const response = await API.GET({
      URL: "providers/verification",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Provider verification status fetched');

    return {
      success: response.data.success,
      verificationStatus: response.data.verificationStatus,
      isVerified: response.data.isVerified,
      documents: response.data.documents,
    };
  } catch (e: any) {
    console.error("❌ Get verification status error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to fetch verification status");
  }
};

/**
 * Persist FCM Token for Provider
 */
export const persistProviderFcmToken = async (fcmToken: string, deviceType: string) => {
  try {
    const token = await retriveData(KeyForStorage.accessToken);

    console.log('📤 Persisting provider FCM token');

    const response = await API.POST({
      URL: "providers/fcm-token",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        fcmToken: fcmToken,
        deviceType: deviceType
      }
    });

    console.log('✅ Provider FCM token persisted successfully');

    return response.data;
  } catch (e: any) {
    console.error("❌ Provider FCM token persistence error:", e);
    throw new Error(e.message);
  }
};