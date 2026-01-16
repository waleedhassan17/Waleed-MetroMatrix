import axios from 'axios';
import { API_URL } from '../network/network';

export interface ForgotPasswordParams {
  email: string;
  userType?: 'user' | 'provider';
}

export interface VerifyResetOTPParams {
  email: string;
  otp: string;
  userType?: 'user' | 'provider';
}

export interface ResendResetOTPParams {
  email: string;
  userType?: 'user' | 'provider';
}

export interface ResetPasswordParams {
  resetToken: string;
  password: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  email?: string;
  expiresIn?: number;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  resetToken: string;
  email: string;
  expiresIn?: number;
}

export interface ResendOTPResponse {
  success: boolean;
  message: string;
  expiresIn?: number;
  retryAfter?: number;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface CheckEmailExistsParams {
  email: string;
  userType?: 'user' | 'provider';
}

export interface CheckEmailExistsResponse {
  exists: boolean;
  message: string;
}

/**
 * Check if email exists before sending password reset OTP
 * GET /api/auth/check-email-exists
 * Query: { email, userType }
 */
export const checkEmailExistsAPI = async (params: CheckEmailExistsParams): Promise<CheckEmailExistsResponse> => {
  try {
    console.log('📤 Checking if email exists:', params.email);
    
    const response = await axios.get(
      `${API_URL}/auth/check-email-exists`,
      {
        params: {
          email: params.email.trim(),
          userType: params.userType || 'user',
        }
      }
    );
    
    console.log('📥 Check email exists response:', response.data);
    
    return {
      exists: response.data.exists || false,
      message: response.data.message || '',
    };
  } catch (error: any) {
    console.error('❌ Check email exists error:', error.response?.data || error.message);
    
    // If API returns 404, email doesn't exist
    if (error.response?.status === 404) {
      return {
        exists: false,
        message: 'No account found with this email address',
      };
    }
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Failed to check email';
    
    throw new Error(errorMessage);
  }
};

/**
 * Request password reset OTP - sends OTP code to user's email
 * POST /api/auth/forgot-password
 * Body: { email, userType }
 */
export const forgotPasswordAPI = async (params: ForgotPasswordParams): Promise<ForgotPasswordResponse> => {
  try {
    console.log('📤 Sending forgot password request for:', params.email);
    
    const response = await axios.post(
      `${API_URL}/auth/forgot-password`,
      {
        email: params.email.trim(),
        userType: params.userType || 'user',
      }
    );
    
    console.log('📥 Forgot password response:', response.data);
    
    return {
      success: response.data.success || true,
      message: response.data.message || 'OTP sent to your email',
      email: params.email.trim(),
      expiresIn: response.data.expiresIn || 600,
    };
  } catch (error: any) {
    console.error('❌ Forgot password error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Failed to send OTP';
    
    throw new Error(errorMessage);
  }
};

/**
 * Verify password reset OTP and get resetToken
 * POST /api/auth/verify-reset-otp
 * Body: { email, otp, userType }
 */
export const verifyResetOTPAPI = async (params: VerifyResetOTPParams): Promise<VerifyOTPResponse> => {
  try {
    console.log('📤 Verifying reset OTP for:', params.email);
    
    const response = await axios.post(
      `${API_URL}/auth/verify-reset-otp`,
      {
        email: params.email.trim(),
        otp: params.otp.trim(),
        userType: params.userType || 'user',
      }
    );
    
    console.log('📥 Verify OTP response:', response.data);
    
    if (!response.data.resetToken) {
      throw new Error('Reset token not received from server');
    }
    
    return {
      success: response.data.success || true,
      message: response.data.message || 'OTP verified successfully',
      resetToken: response.data.resetToken,
      email: params.email.trim(),
      expiresIn: response.data.expiresIn || 300,
    };
  } catch (error: any) {
    console.error('❌ Verify OTP error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Invalid or expired OTP';
    
    throw new Error(errorMessage);
  }
};

/**
 * Resend password reset OTP
 * POST /api/auth/resend-reset-otp
 * Body: { email, userType }
 */
export const resendResetOTPAPI = async (params: ResendResetOTPParams): Promise<ResendOTPResponse> => {
  try {
    console.log('📤 Resending reset OTP for:', params.email);
    
    const response = await axios.post(
      `${API_URL}/auth/resend-reset-otp`,
      {
        email: params.email.trim(),
        userType: params.userType || 'user',
      }
    );
    
    console.log('📥 Resend OTP response:', response.data);
    
    return {
      success: response.data.success || true,
      message: response.data.message || 'New OTP sent to your email',
      expiresIn: response.data.expiresIn || 600,
      retryAfter: response.data.retryAfter,
    };
  } catch (error: any) {
    console.error('❌ Resend OTP error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Failed to resend OTP';
    
    throw new Error(errorMessage);
  }
};

/**
 * Reset password with resetToken
 * POST /api/auth/reset-password
 * Body: { resetToken, password }
 */
export const resetPasswordAPI = async (params: ResetPasswordParams): Promise<ResetPasswordResponse> => {
  try {
    console.log('📤 Resetting password with token');
    
    const response = await axios.post(
      `${API_URL}/auth/reset-password`,
      {
        resetToken: params.resetToken,
        password: params.password,
      }
    );
    
    console.log('📥 Reset password response:', response.data);
    
    return {
      success: response.data.success || true,
      message: response.data.message || 'Password reset successfully',
      user: response.data.user,
    };
  } catch (error: any) {
    console.error('❌ Reset password error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Failed to reset password';
    
    throw new Error(errorMessage);
  }
};