// User model interface
export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  
  // Profile information
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  profilePhoto?: string;
  
  // Address information
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Account status
  profileComplete?: boolean;
  isVerified?: boolean;
  emailVerified?: boolean; // NEW
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  
  // Authentication
  lastLoginDate?: string;
  
  // Preferences
  preferences?: {
    notifications?: boolean;
    newsletter?: boolean;
    language?: string;
    theme?: 'light' | 'dark' | 'auto';
  };
}

// User authentication response
export interface UserAuthResponse {
  success: boolean;
  user: UserInfo;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresEmailVerification?: boolean; // NEW
}

// User registration data
export interface UserRegistrationData {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  acceptTerms?: boolean;
}

// User login data
export interface UserLoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Social login data
export interface SocialLoginData {
  provider: 'google' | 'facebook';
  accessToken: string;
  userInfo?: {
    email?: string;
    fullName?: string;
    profilePhoto?: string;
  };
}

// Profile completion data
export interface ProfileCompletionData {
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  profilePhoto?: string;
}

// Profile completion step
export interface ProfileCompletionStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  isComplete: boolean;
}

// Email verification types
export interface EmailVerificationRequest {
  email: string;
  userType?: 'user' | 'provider';
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  expiresIn?: string;
}

export interface VerifyEmailTokenRequest {
  token: string;
  userType?: 'user' | 'provider';
}

export interface CheckVerificationStatusRequest {
  email: string;
  userType?: 'user' | 'provider';
}

export interface VerificationStatusResponse {
  success: boolean;
  emailVerified: boolean;
  isVerified: boolean;
  canLogin: boolean;
  verificationPending: boolean;
}