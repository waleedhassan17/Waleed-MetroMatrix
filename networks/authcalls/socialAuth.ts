import { API } from "../network/network";
import { UserAuthResponse, UserInfo } from "../../models/user";

/**
 * Social Auth Response interface
 */
export interface SocialAuthResponse {
  success: boolean;
  message: string;
  isNewUser: boolean;
  userType: 'user' | 'provider';
  user: {
    id: string;
    email: string;
    fullName: string;
    profilePhoto?: string;
    isVerified: boolean;
    phoneNumber: string;
    profileComplete: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Google Signup
 * POST /auth/google-signup
 * @param idToken - Firebase ID token from Google Sign-in
 * @param userType - 'user' or 'provider'
 */
export const googleSignupAPI = async (idToken: string, userType: 'user' | 'provider' = 'user'): Promise<SocialAuthResponse> => {
  try {
    console.log('📤 Google signup request for:', userType);

    const response = await API.POST({
      URL: "/auth/google-signup",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        idToken,
        userType,
      },
    });

    console.log('✅ Google signup successful:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Google signup failed');
    }

    return response.data as SocialAuthResponse;
  } catch (e: any) {
    console.error("❌ Google signup error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Google signup failed";
    
    throw new Error(errorMessage);
  }
};

/**
 * Google Login
 * POST /auth/google-login
 * @param idToken - Firebase ID token from Google Sign-in
 * @param userType - 'user' or 'provider'
 */
export const googleLoginAPI = async (idToken: string, userType: 'user' | 'provider' = 'user'): Promise<SocialAuthResponse> => {
  try {
    console.log('📤 Google login request for:', userType);

    const response = await API.POST({
      URL: "/auth/google-login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        idToken,
        userType,
      },
    });

    console.log('✅ Google login successful:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Google login failed');
    }

    return response.data as SocialAuthResponse;
  } catch (e: any) {
    console.error("❌ Google login error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Google login failed";
    
    throw new Error(errorMessage);
  }
};

/**
 * Facebook Signup
 * POST /auth/facebook-signup
 * @param accessToken - Facebook access token
 * @param userType - 'user' or 'provider'
 */
export const facebookSignupAPI = async (accessToken: string, userType: 'user' | 'provider' = 'user'): Promise<SocialAuthResponse> => {
  try {
    console.log('📤 Facebook signup request for:', userType);

    const response = await API.POST({
      URL: "/auth/facebook-signup",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        accessToken,
        userType,
      },
    });

    console.log('✅ Facebook signup successful:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Facebook signup failed');
    }

    return response.data as SocialAuthResponse;
  } catch (e: any) {
    console.error("❌ Facebook signup error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Facebook signup failed";
    
    throw new Error(errorMessage);
  }
};

/**
 * Facebook Login
 * POST /auth/facebook-login
 * @param accessToken - Facebook access token
 * @param userType - 'user' or 'provider'
 */
export const facebookLoginAPI = async (accessToken: string, userType: 'user' | 'provider' = 'user'): Promise<SocialAuthResponse> => {
  try {
    console.log('📤 Facebook login request for:', userType);

    const response = await API.POST({
      URL: "/auth/facebook-login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        accessToken,
        userType,
      },
    });

    console.log('✅ Facebook login successful:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Facebook login failed');
    }

    return response.data as SocialAuthResponse;
  } catch (e: any) {
    console.error("❌ Facebook login error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Facebook login failed";
    
    throw new Error(errorMessage);
  }
};

/**
 * Convert SocialAuthResponse to UserAuthResponse format
 */
export const convertSocialToUserAuth = (socialResponse: SocialAuthResponse): UserAuthResponse => {
  return {
    success: socialResponse.success,
    user: {
      id: socialResponse.user.id,
      email: socialResponse.user.email,
      fullName: socialResponse.user.fullName,
      phoneNumber: socialResponse.user.phoneNumber || '',
      profilePhoto: socialResponse.user.profilePhoto,
      profileComplete: socialResponse.user.profileComplete,
      isVerified: socialResponse.user.isVerified,
      emailVerified: socialResponse.user.isVerified,
    },
    accessToken: socialResponse.accessToken,
    refreshToken: socialResponse.refreshToken,
  };
};
