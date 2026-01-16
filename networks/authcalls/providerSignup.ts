import { API } from "../network/network";

/**
 * Provider Sign Up (Register)
 * POST /auth/provider/register
 */
export const providerAuthRegister = async (signUpInfo: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}) => {
  try {
    const { fullName, email, phoneNumber, password } = signUpInfo;

    console.log('📤 Attempting provider registration for:', email);

    const response = await API.POST({
      URL: "auth/provider/register",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        password: password,
      },
    });

    console.log('✅ Provider registration response:', response.data);
    console.log('📊 Success:', response.data.success);
    console.log('📊 Provider ID:', response.data.provider?._id);
    console.log('📊 Email verified status:', response.data.provider?.emailVerified);
    console.log('📊 Admin verified status:', response.data.provider?.adminVerified);
    console.log('📧 Email sent:', response.data.emailSent);

    // ✅ CRITICAL: Validate the registration actually succeeded
    if (!response.data.success) {
      throw new Error(response.data.message || 'Registration failed - server returned unsuccessful status');
    }

    if (!response.data.provider || !response.data.provider._id) {
      console.error('❌ Registration returned success but no provider record!');
      console.error('📊 Full response:', JSON.stringify(response.data, null, 2));
      throw new Error('Registration incomplete - provider record was not created. Please try again.');
    }

    console.log('✅ Provider registration CONFIRMED successful - Provider ID:', response.data.provider._id);

    return {
      success: response.data.success,
      message: response.data.message,
      provider: response.data.provider,
      emailSent: response.data.emailSent ?? true, // Backend now returns this flag
      // Note: No tokens returned - provider must verify email first
    };
  } catch (e: any) {
    console.error("❌ Provider registration error:", e);
    
    let errorMessage = "Registration failed. Please try again.";
    
    if (e.response?.data?.message) {
      errorMessage = e.response.data.message;
    } else if (e.response?.data?.error) {
      errorMessage = e.response.data.error;
    } else if (e.message) {
      errorMessage = e.message;
    }
    
    // Handle specific error cases
    if (errorMessage.toLowerCase().includes('email')) {
      errorMessage = "An account with this email already exists";
    } else if (errorMessage.toLowerCase().includes('phone')) {
      errorMessage = "An account with this phone number already exists";
    } else if (errorMessage.toLowerCase().includes('onboardingstatus') || errorMessage.toLowerCase().includes('enum')) {
      errorMessage = "Server configuration error. Please contact support.\n\nTechnical details: Backend onboardingStatus field needs to be updated.";
      console.error("🔥 BACKEND ISSUE: onboardingStatus enum doesn't include 'pending_email_verification'");
      console.error("🔥 Backend team needs to fix Provider model enum values");
    } else if (errorMessage.toLowerCase().includes('validation failed')) {
      errorMessage = "Server validation error. Please contact support.\n\nDetails: " + errorMessage;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Provider Google OAuth Sign Up
 * GET /auth/google?type=provider
 */
export const providerGoogleOAuthLogin = async () => {
  try {
    console.log('📤 Initiating Google OAuth for provider signup');

    const response = await API.GET({
      URL: "auth/google",
      params: {
        type: 'provider'
      },
    });

    console.log('✅ Provider Google OAuth successful:', response.data);

    return {
      success: response.data.success,
      provider: response.data.provider,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  } catch (e: any) {
    console.error("❌ Provider Google OAuth error:", e);
    throw new Error(e.response?.data?.message || e.message || "Google sign-up failed");
  }
};

/**
 * Provider Facebook OAuth Sign Up
 * GET /auth/facebook?type=provider
 */
export const providerFacebookOAuthLogin = async () => {
  try {
    console.log('📤 Initiating Facebook OAuth for provider signup');

    const response = await API.GET({
      URL: "auth/facebook",
      params: {
        type: 'provider'
      },
    });

    console.log('✅ Provider Facebook OAuth successful:', response.data);

    return {
      success: response.data.success,
      provider: response.data.provider,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  } catch (e: any) {
    console.error("❌ Provider Facebook OAuth error:", e);
    throw new Error(e.response?.data?.message || e.message || "Facebook sign-up failed");
  }
};

/**
 * Check Email Availability for Provider
 */
export const checkProviderEmailAvailability = async (email: string) => {
  try {
    console.log('📤 Checking provider email availability:', email);

    const response = await API.POST({
      URL: "auth/provider/check-email",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
      },
    });

    return {
      available: response.data.available,
      message: response.data.message,
    };
  } catch (e: any) {
    console.error("❌ Provider email check error:", e);
    
    // If endpoint doesn't exist, assume email is available
    return {
      available: true,
      message: "Email availability check unavailable",
    };
  }
};

/**
 * Verify Provider Email
 * POST /auth/verify-email
 */
export const verifyProviderEmail = async (token: string) => {
  try {
    console.log('📤 Verifying provider email with token');

    const response = await API.POST({
      URL: "auth/verify-email",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        token: token,
      },
    });

    console.log('✅ Provider email verified successfully');

    return {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (e: any) {
    console.error("❌ Provider email verification error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Email verification failed";
    
    throw new Error(errorMessage);
  }
};

/**
 * Resend Verification Email for Provider
 */
export const resendProviderVerificationEmail = async (email: string) => {
  try {
    console.log('📤 Resending provider verification email to:', email);

    const response = await API.POST({
      URL: "auth/provider/resend-verification",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
      },
    });

    console.log('✅ Provider verification email sent');

    return {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (e: any) {
    console.error("❌ Resend provider verification error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to resend verification email");
  }
};

/**
 * Forgot Password for Provider
 * POST /auth/forgot-password
 */
export const providerForgotPassword = async (email: string) => {
  try {
    console.log('📤 Requesting provider password reset for:', email);

    const response = await API.POST({
      URL: "auth/forgot-password",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
        userType: 'provider', // Specify this is for provider
      },
    });

    console.log('✅ Provider password reset email sent');

    return {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (e: any) {
    console.error("❌ Provider forgot password error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to send password reset email";
    
    throw new Error(errorMessage);
  }
};

/**
 * Reset Password for Provider
 * POST /auth/reset-password
 */
export const providerResetPassword = async (token: string, password: string) => {
  try {
    console.log('📤 Resetting provider password with token');

    const response = await API.POST({
      URL: "auth/reset-password",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        token: token,
        password: password,
      },
    });

    console.log('✅ Provider password reset successful');

    return {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (e: any) {
    console.error("❌ Provider reset password error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Password reset failed";
    
    throw new Error(errorMessage);
  }
};