import { API } from "../network/network";
import { UserRegistrationData, UserAuthResponse } from "../../models/user";

/**
 * User Sign Up (Register)
 * POST /auth/register
 */
export const authRegister = async ({ signUpInfo }: { signUpInfo: UserRegistrationData }) => {
  try {
    const { fullName, email, phoneNumber, password } = signUpInfo;

    console.log('📤 Attempting user registration for:', email);

    // Ensure proper URL formatting - use /auth/register with leading slash
    const response = await API.POST({
      URL: "/auth/register", // Added leading slash
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

    console.log('✅ Registration response received');
    console.log('Response status:', response.status);
    console.log('Response data keys:', Object.keys(response.data || {}));
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    // More flexible validation - check for various possible response structures
    const responseData = response.data;
    
    if (!responseData) {
      console.error('❌ Empty response data');
      throw new Error('Invalid response format from server: Empty response');
    }

    console.log('🔍 Response data structure verified');

    // Check for user object in various possible locations
    let user = responseData.user || responseData.data?.user;
    let accessToken = responseData.accessToken || responseData.data?.accessToken || responseData.token;
    let refreshToken = responseData.refreshToken || responseData.data?.refreshToken;

    console.log('🔍 Extracted user:', user ? 'exists' : 'missing');
    console.log('🔍 Extracted accessToken:', accessToken ? 'exists' : 'missing');
    console.log('🔍 Extracted refreshToken:', refreshToken ? 'exists' : 'missing');

    // If user is missing, try to construct it from the request
    if (!user) {
      console.warn('⚠️ User object not in expected location, constructing from request data');
      user = {
        id: responseData.id || responseData._id || `user_${Date.now()}`,
        email,
        fullName,
        phoneNumber,
      };
    }

    // ✅ IMPORTANT: Signup does NOT return access token yet
    // Access token is only issued AFTER email verification succeeds
    // This is intentional - user must verify email before getting authenticated
    if (!accessToken) {
      console.log('ℹ️ No accessToken in signup response (expected - token issued after email verification)');
      // Don't throw error - this is normal behavior
      accessToken = null;
    }

    console.log('✅ Response validation passed');

    // Map API response to our UserAuthResponse format
    const authResponse: UserAuthResponse = {
      success: responseData.success ?? true,
      user: {
        id: user.id || user._id || `user_${Date.now()}`,
        email: user.email || email,
        fullName: user.fullName || fullName,
        phoneNumber: user.phoneNumber || phoneNumber,
        profilePhoto: user.profilePhoto,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        profileComplete: user.profileComplete || false,
        isVerified: user.isVerified || false,
        emailVerified: user.emailVerified || false,
      },
      accessToken: accessToken,
      refreshToken: refreshToken || '',
    };

    console.log('✅ Registration successful, returning authResponse');
    return authResponse;
  } catch (e: any) {
    console.error("❌ Registration error:", e);
    console.error("❌ Error code:", e.code);
    console.error("❌ Error response status:", e.response?.status);
    console.error("❌ Error response data:", JSON.stringify(e.response?.data, null, 2));
    
    let errorMessage = "Registration failed. Please try again.";
    
    // Handle network errors
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED') {
      errorMessage = "Network error. Please check your connection.";
    }
    // Handle 404 errors specifically
    else if (e.response?.status === 404) {
      errorMessage = "Service unavailable. API endpoint not found.";
      console.error("🚨 API endpoint not found. Check base URL configuration.");
    }
    // Handle 500 errors
    else if (e.response?.status >= 500) {
      errorMessage = "Server error. Please try again later.";
    }
    // Handle validation errors
    else if (e.response?.status === 400 || e.response?.status === 422) {
      if (e.response?.data?.message) {
        errorMessage = e.response.data.message;
      } else if (e.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e.response?.data?.errors) {
        // Handle validation errors array
        const errors = e.response.data.errors;
        errorMessage = Array.isArray(errors) 
          ? errors.map((err: any) => err.message || err).join(', ')
          : errors;
      }
    }
    // Handle other API errors
    else if (e.response?.data?.message) {
      errorMessage = e.response.data.message;
    } else if (e.response?.data?.error) {
      errorMessage = e.response.data.error;
    } else if (e.message) {
      errorMessage = e.message;
    }
    
    // Handle specific error cases
    if (errorMessage.toLowerCase().includes('email') && 
        errorMessage.toLowerCase().includes('exist')) {
      errorMessage = "An account with this email already exists";
    } else if (errorMessage.toLowerCase().includes('phone') && 
               errorMessage.toLowerCase().includes('exist')) {
      errorMessage = "An account with this phone number already exists";
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * User Google OAuth Sign Up
 * GET /auth/google?type=user
 */
export const googleOAuthRegister = async () => {
  try {
    console.log('📤 Initiating Google OAuth for user signup');

    const response = await API.GET({
      URL: "auth/google",
      params: {
        type: 'user'
      },
    });

    console.log('✅ User Google OAuth successful:', response.data);

    // Validate response structure
    if (!response.data || !response.data.user || !response.data.accessToken) {
      throw new Error('Invalid response format from server');
    }

    const authResponse: UserAuthResponse = {
      success: response.data.success ?? true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || '',
    };

    return authResponse;
  } catch (e: any) {
    console.error("❌ Google OAuth signup error:", e);
    throw new Error(e.response?.data?.message || e.message || "Google sign-up failed");
  }
};

/**
 * User Facebook OAuth Sign Up
 * GET /auth/facebook?type=user
 */
export const facebookOAuthRegister = async () => {
  try {
    console.log('📤 Initiating Facebook OAuth for user signup');

    const response = await API.GET({
      URL: "auth/facebook",
      params: {
        type: 'user'
      },
    });

    console.log('✅ User Facebook OAuth successful:', response.data);

    // Validate response structure
    if (!response.data || !response.data.user || !response.data.accessToken) {
      throw new Error('Invalid response format from server');
    }

    const authResponse: UserAuthResponse = {
      success: response.data.success ?? true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || '',
    };

    return authResponse;
  } catch (e: any) {
    console.error("❌ Facebook OAuth signup error:", e);
    throw new Error(e.response?.data?.message || e.message || "Facebook sign-up failed");
  }
};

/**
 * Verify Email
 * POST /auth/verify-email
 */
export const verifyEmail = async (token: string) => {
  try {
    console.log('📤 Verifying email with token');

    const response = await API.POST({
      URL: "/auth/verify-email", // Added leading slash
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        token: token,
      },
    });

    console.log('✅ Email verified successfully');

    return {
      success: response.data.success ?? true,
      message: response.data.message || 'Email verified successfully',
    };
  } catch (e: any) {
    console.error("❌ Email verification error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Email verification failed";
    
    throw new Error(errorMessage);
  }
};

/**
 * Resend Verification Email
 * POST /auth/resend-verification
 */
export const resendVerificationEmail = async (email: string) => {
  try {
    console.log('📤 Resending verification email to:', email);

    const response = await API.POST({
      URL: "/auth/resend-verification", // Added leading slash
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
      },
    });

    console.log('✅ Verification email sent');

    return {
      success: response.data.success ?? true,
      message: response.data.message || 'Verification email sent',
    };
  } catch (e: any) {
    console.error("❌ Resend verification error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to resend verification email");
  }
};

/**
 * Check Email Availability
 * POST /auth/check-email
 */
export const checkEmailAvailability = async (email: string) => {
  try {
    console.log('📤 Checking email availability:', email);

    const response = await API.POST({
      URL: "/auth/check-email", // Added leading slash
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
      },
    });

    return {
      available: response.data.available ?? true,
      message: response.data.message || '',
    };
  } catch (e: any) {
    console.error("❌ Email check error:", e);
    
    // If the endpoint doesn't exist, assume email is available
    return {
      available: true,
      message: "Email availability check unavailable",
    };
  }
};

/**
 * Forgot Password
 * POST /auth/forgot-password
 */
export const forgotPassword = async (email: string) => {
  try {
    console.log('📤 Requesting password reset for:', email);

    const response = await API.POST({
      URL: "/auth/forgot-password", // Added leading slash
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: email.trim().toLowerCase(),
      },
    });

    console.log('✅ Password reset email sent');

    return {
      success: response.data.success ?? true,
      message: response.data.message || 'Password reset email sent',
    };
  } catch (e: any) {
    console.error("❌ Forgot password error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to send password reset email";
    
    throw new Error(errorMessage);
  }
};

/**
 * Reset Password
 * POST /auth/reset-password
 */
export const resetPassword = async (token: string, password: string) => {
  try {
    console.log('📤 Resetting password with token');

    const response = await API.POST({
      URL: "/auth/reset-password", // Added leading slash
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        token: token,
        password: password,
      },
    });

    console.log('✅ Password reset successful');

    return {
      success: response.data.success ?? true,
      message: response.data.message || 'Password reset successful',
    };
  } catch (e: any) {
    console.error("❌ Reset password error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Password reset failed";
    
    throw new Error(errorMessage);
  }
};