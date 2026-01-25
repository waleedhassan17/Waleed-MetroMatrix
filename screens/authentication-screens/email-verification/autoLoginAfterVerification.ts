/**
 * Auto-Login After Email Verification Flow
 * 
 * This module handles automatically logging in users after they verify their email.
 * Instead of requiring users to manually login again, we use the stored email/password
 * from signup to automatically authenticate them.
 * 
 * IMPORTANT: We always perform a FRESH login to ensure the token belongs to the
 * correct user, not reuse any existing tokens that might belong to a different account.
 */

import { authLogin } from '../../../networks/authcalls/userSignin';
import { providerAuthLogin } from '../../../networks/authcalls/providerSignin';
import { 
  saveData, 
  removeData, 
  retrieveData, 
  KeyForStorage,
  saveUserInfo,
  clearAuthData,
} from '../../../utils/storage_utils/storageUtils';

// ✅ Response types for auto-login
export interface AutoLoginResponse {
  success: boolean;
  message: string;
  userType: 'user' | 'provider';
  accessToken: string;
  refreshToken?: string;
}

export interface AutoLoginError {
  success: false;
  message: string;
  code: 'NO_CREDENTIALS' | 'LOGIN_FAILED' | 'STORAGE_ERROR' | 'UNKNOWN';
}

/**
 * ✅ Helper to validate token
 */
const isValidToken = (token: any): token is string => {
  if (!token || token === null || token === undefined) return false;
  if (typeof token !== 'string') return false;
  if (token === 'null' || token === 'undefined' || token.trim() === '') return false;
  if (token.length < 10) return false;
  return true;
};

/**
 * Auto-Login for User After Email Verification
 * 
 * IMPORTANT: This ALWAYS performs a fresh login to ensure the correct user gets authenticated.
 * We don't reuse existing tokens because they might belong to a different account.
 * 
 * Workflow:
 * 1. Clear any existing auth data (could belong to different user)
 * 2. Validate credentials
 * 3. Call login API with those credentials
 * 4. Save tokens to AsyncStorage
 * 5. Clear temporary signup state/credentials
 * 6. Return success for navigation
 * 
 * @param email - User's email from signup
 * @param password - User's password from signup (in plain text)
 * @returns Promise<AutoLoginResponse | AutoLoginError>
 */
export const autoLoginUser = async (
  email: string | number | any,
  password: string | number | any
): Promise<AutoLoginResponse | AutoLoginError> => {
  try {
    console.log('🔐 Auto-login user flow started');
    console.log('📧 Email:', email);
    console.log('🔑 Password received type:', typeof password);
    console.log('📧 Email received type:', typeof email);

    // ✅ CRITICAL FIX: Clear any existing auth data first!
    // This prevents using tokens from a different user/account
    console.log('🧹 Clearing any existing auth data before fresh login...');
    await clearAuthData();
    console.log('✅ Existing auth data cleared');

    // ✅ Step 1: Validate and normalize credentials
    // CRITICAL FIX: Convert to string first, then validate
    if (email === null || email === undefined || password === null || password === undefined) {
      console.error('❌ Missing email or password for auto-login');
      return {
        success: false,
        message: 'Email and password required for auto-login',
        code: 'NO_CREDENTIALS',
      };
    }

    // ✅ CRITICAL FIX: Always convert to string (handles numeric passwords like "12345678")
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password);

    console.log('📧 Normalized email:', normalizedEmail);
    console.log('🔑 Normalized password type:', typeof normalizedPassword);
    console.log('🔑 Normalized password length:', normalizedPassword.length);

    if (!normalizedEmail || normalizedEmail.length < 3) {
      console.error('❌ Invalid email format for auto-login');
      return {
        success: false,
        message: 'Invalid email',
        code: 'NO_CREDENTIALS',
      };
    }

    if (!normalizedPassword || normalizedPassword.length < 1) {
      console.error('❌ Invalid password format for auto-login');
      return {
        success: false,
        message: 'Invalid password',
        code: 'NO_CREDENTIALS',
      };
    }

    console.log('✅ Credentials normalized and validated');

    // ✅ Step 2: Call login API - ALWAYS perform fresh login
    console.log('📤 Calling user login API for fresh authentication...');
    const loginResult = await authLogin({
      signInInfo: {
        email: normalizedEmail,
        password: normalizedPassword,
      },
    });

    console.log('✅ User login API successful');
    console.log('📊 Login result keys:', Object.keys(loginResult));

    if (!isValidToken(loginResult.accessToken)) {
      console.error('❌ No valid access token in login response');
      return {
        success: false,
        message: 'Login failed - no access token received',
        code: 'LOGIN_FAILED',
      };
    }

    // ✅ Step 3: Save tokens and user info to AsyncStorage
    console.log('💾 Saving tokens and user info to storage...');

    try {
      // Save access token
      const tokenSaved = await saveData(KeyForStorage.accessToken, loginResult.accessToken);
      if (!tokenSaved) {
        throw new Error('Failed to save access token');
      }
      console.log('✅ Access token saved');

      // Save refresh token if provided
      if (isValidToken(loginResult.refreshToken)) {
        await saveData(KeyForStorage.refreshToken, loginResult.refreshToken);
        console.log('✅ Refresh token saved');
      }

      // Save user info
      if (loginResult.user) {
        await saveUserInfo(loginResult.user);
        console.log('✅ User info saved');
      }

      // Mark as authenticated
      await saveData(KeyForStorage.isAuthenticated, true);
      console.log('✅ Authentication status saved');

      // Save user type - IMPORTANT: Set to 'user' not 'provider'
      await saveData(KeyForStorage.userType, 'user');
      console.log('✅ User type saved as "user"');
    } catch (storageError: any) {
      console.error('❌ Error saving to storage:', storageError);
      return {
        success: false,
        message: 'Failed to save authentication data',
        code: 'STORAGE_ERROR',
      };
    }

    // ✅ Step 4: Clear temporary signup credentials
    console.log('🧹 Clearing temporary signup credentials...');
    try {
      await removeData('tempPassword');
      await removeData('tempEmail');
      await removeData('tempUserType');
      console.log('✅ Temporary credentials cleared');
    } catch (clearError) {
      // Non-critical - these might not exist
      console.warn('⚠️ Could not clear temporary credentials:', clearError);
    }

    console.log('🎉 Auto-login user flow completed successfully');
    console.log('👤 Logged in as USER:', normalizedEmail);

    // ✅ Step 5: Return success response
    return {
      success: true,
      message: 'Auto-login successful',
      userType: 'user',
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    };
  } catch (error: any) {
    console.error('❌ Auto-login user error:', error.message);
    console.error('Error details:', error);

    return {
      success: false,
      message: error.message || 'Auto-login failed',
      code: 'UNKNOWN',
    };
  }
};

/**
 * Auto-Login for Provider After Email Verification
 * 
 * IMPORTANT: This ALWAYS performs a fresh login to ensure the correct provider gets authenticated.
 * We don't reuse existing tokens because they might belong to a different account.
 * 
 * Workflow:
 * 1. Clear any existing auth data (could belong to different user)
 * 2. Validate credentials
 * 3. Call provider login API with those credentials
 * 4. Save tokens to AsyncStorage
 * 5. Clear temporary signup state/credentials
 * 6. Return success for navigation
 * 
 * @param email - Provider's email from signup
 * @param password - Provider's password from signup (in plain text)
 * @returns Promise<AutoLoginResponse | AutoLoginError>
 */
export const autoLoginProvider = async (
  email: string | number | any,
  password: string | number | any
): Promise<AutoLoginResponse | AutoLoginError> => {
  try {
    console.log('🔐 Auto-login provider flow started');
    console.log('📧 Email:', email);
    console.log('🔑 Password received type:', typeof password);
    console.log('📧 Email received type:', typeof email);

    // ✅ CRITICAL FIX: Clear any existing auth data first!
    // This prevents using tokens from a different user/account
    console.log('🧹 Clearing any existing auth data before fresh login...');
    await clearAuthData();
    console.log('✅ Existing auth data cleared');

    // ✅ Step 1: Validate and normalize credentials
    // CRITICAL FIX: Convert to string first, then validate
    if (email === null || email === undefined || password === null || password === undefined) {
      console.error('❌ Missing email or password for auto-login');
      return {
        success: false,
        message: 'Email and password required for auto-login',
        code: 'NO_CREDENTIALS',
      };
    }

    // ✅ CRITICAL FIX: Always convert to string (handles numeric passwords like "12345678")
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password);

    console.log('📧 Normalized email:', normalizedEmail);
    console.log('🔑 Normalized password type:', typeof normalizedPassword);
    console.log('🔑 Normalized password length:', normalizedPassword.length);

    if (!normalizedEmail || normalizedEmail.length < 3) {
      console.error('❌ Invalid email format for auto-login');
      return {
        success: false,
        message: 'Invalid email',
        code: 'NO_CREDENTIALS',
      };
    }

    if (!normalizedPassword || normalizedPassword.length < 1) {
      console.error('❌ Invalid password format for auto-login');
      return {
        success: false,
        message: 'Invalid password',
        code: 'NO_CREDENTIALS',
      };
    }

    console.log('✅ Credentials normalized and validated');

    // ✅ Step 2: Call provider login API - ALWAYS perform fresh login
    console.log('📤 Calling provider login API for fresh authentication...');
    const loginResult = await providerAuthLogin({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    console.log('✅ Provider login API successful');
    console.log('📊 Login result keys:', Object.keys(loginResult));

    if (!isValidToken(loginResult.accessToken)) {
      console.error('❌ No valid access token in login response');
      return {
        success: false,
        message: 'Login failed - no access token received',
        code: 'LOGIN_FAILED',
      };
    }

    // ✅ Step 3: Save tokens and provider info to AsyncStorage
    console.log('💾 Saving tokens and provider info to storage...');

    try {
      // Save access token
      const tokenSaved = await saveData(KeyForStorage.accessToken, loginResult.accessToken);
      if (!tokenSaved) {
        throw new Error('Failed to save access token');
      }
      console.log('✅ Access token saved');

      // Save as provider-specific token as well
      await saveData(KeyForStorage.providerAccessToken, loginResult.accessToken);
      console.log('✅ Provider access token saved');

      // Save refresh token if provided
      if (isValidToken(loginResult.refreshToken)) {
        await saveData(KeyForStorage.refreshToken, loginResult.refreshToken);
        console.log('✅ Refresh token saved');
      }

      // Save provider info
      if (loginResult.provider) {
        await saveUserInfo(loginResult.provider);
        console.log('✅ Provider info saved');
      }

      // Mark as authenticated
      await saveData(KeyForStorage.isAuthenticated, true);
      console.log('✅ Authentication status saved');

      // Save user type - IMPORTANT: Set to 'provider'
      await saveData(KeyForStorage.userType, 'provider');
      console.log('✅ User type saved as "provider"');
    } catch (storageError: any) {
      console.error('❌ Error saving to storage:', storageError);
      return {
        success: false,
        message: 'Failed to save authentication data',
        code: 'STORAGE_ERROR',
      };
    }

    // ✅ Step 4: Clear temporary signup credentials
    console.log('🧹 Clearing temporary signup credentials...');
    try {
      await removeData('tempPassword');
      await removeData('tempEmail');
      await removeData('tempUserType');
      console.log('✅ Temporary credentials cleared');
    } catch (clearError) {
      // Non-critical - these might not exist
      console.warn('⚠️ Could not clear temporary credentials:', clearError);
    }

    console.log('🎉 Auto-login provider flow completed successfully');
    console.log('👤 Logged in as PROVIDER:', normalizedEmail);

    // ✅ Step 5: Return success response
    return {
      success: true,
      message: 'Auto-login successful',
      userType: 'provider',
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    };
  } catch (error: any) {
    console.error('❌ Auto-login provider error:', error.message);
    console.error('Error details:', error);

    return {
      success: false,
      message: error.message || 'Auto-login failed',
      code: 'UNKNOWN',
    };
  }
};

/**
 * Generic Auto-Login Function (User or Provider)
 * 
 * Automatically detects user type and calls appropriate login function
 * 
 * @param email - User/Provider email from signup
 * @param password - User/Provider password from signup
 * @param userType - 'user' or 'provider'
 * @returns Promise<AutoLoginResponse | AutoLoginError>
 */
export const autoLogin = async (
  email: string | number | any,
  password: string | number | any,
  userType: 'user' | 'provider'
): Promise<AutoLoginResponse | AutoLoginError> => {
  console.log('🔐 Starting auto-login flow');
  console.log('👤 User type:', userType);
  console.log('📧 Email:', email);
  console.log('🔑 Password received type:', typeof password);
  console.log('📧 Email received type:', typeof email);

  // ✅ CRITICAL FIX: Convert to strings immediately, don't validate types
  // This handles the case where storage returns numbers for numeric-looking values
  if (email === null || email === undefined) {
    console.error('❌ Email is null/undefined');
    return {
      success: false,
      message: 'Email is required',
      code: 'NO_CREDENTIALS',
    };
  }

  if (password === null || password === undefined) {
    console.error('❌ Password is null/undefined');
    return {
      success: false,
      message: 'Password is required',
      code: 'NO_CREDENTIALS',
    };
  }

  // Convert to strings
  const emailStr = String(email);
  const passwordStr = String(password);

  console.log('✅ Converted to strings - Email length:', emailStr.length, 'Password length:', passwordStr.length);

  if (userType !== 'user' && userType !== 'provider') {
    console.error('❌ Invalid user type:', userType);
    return {
      success: false,
      message: 'Invalid user type',
      code: 'UNKNOWN',
    };
  }

  if (userType === 'provider') {
    return autoLoginProvider(emailStr, passwordStr);
  } else {
    return autoLoginUser(emailStr, passwordStr);
  }
};

/**
 * Check if Token Already Exists
 * Used to determine if we should skip auto-login
 * 
 * NOTE: This is now less useful since we always perform fresh login,
 * but kept for backward compatibility
 * 
 * @returns Promise<boolean> - true if valid token exists, false otherwise
 */
export const isAlreadyAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);
    return isValidToken(token);
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

/**
 * Clear Temporary Signup Data
 * Removes email and password stored during signup
 * Called after successful auto-login
 * 
 * @returns Promise<void>
 */
export const clearTemporarySignupData = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing temporary signup data...');
    await removeData('tempEmail');
    await removeData('tempPassword');
    await removeData('tempUserType');
    console.log('✅ Temporary signup data cleared');
  } catch (error) {
    console.warn('⚠️ Error clearing temporary signup data:', error);
  }
};

/**
 * Get Temporary Credentials
 * Retrieves stored credentials for auto-login
 * 
 * @returns Promise<{ email: string | null; password: string | null; userType: string | null }>
 */
export const getTempCredentials = async (): Promise<{
  email: string | null;
  password: string | null;
  userType: string | null;
}> => {
  try {
    const emailRaw = await retrieveData('tempEmail');
    const passwordRaw = await retrieveData('tempPassword');
    const userTypeRaw = await retrieveData('tempUserType');
    
    // ✅ CRITICAL FIX: Convert to strings (storage may return numbers)
    return {
      email: emailRaw ? String(emailRaw) : null,
      password: passwordRaw ? String(passwordRaw) : null,
      userType: userTypeRaw ? String(userTypeRaw) : null,
    };
  } catch (error) {
    console.error('Error getting temp credentials:', error);
    return {
      email: null,
      password: null,
      userType: null,
    };
  }
};

/**
 * Get Navigation Route Based on User Type
 * 
 * @param userType - 'user' or 'provider'
 * @param isProfileComplete - Whether user/provider has completed profile
 * @returns string - Route name for navigation
 */
export const getNextRouteAfterAutoLogin = (
  userType: 'user' | 'provider',
  isProfileComplete: boolean = false
): string => {
  if (isProfileComplete) {
    return userType === 'user' ? 'UserHome' : 'HomeServiceProviderDashboard';
  }

  return userType === 'user' ? 'CompleteProfile' : 'PersonalInfo';
};

/**
 * Navigation Flow After Auto-Login Success
 * 
 * @param navigation - React Navigation object
 * @param userType - 'user' or 'provider'
 * @param isProfileComplete - Whether profile is complete
 */
export const navigateAfterAutoLogin = (
  navigation: any,
  userType: 'user' | 'provider',
  isProfileComplete: boolean = false
): void => {
  const nextRoute = getNextRouteAfterAutoLogin(userType, isProfileComplete);

  console.log(`📍 Navigating to ${nextRoute} screen after auto-login`);

  // Reset navigation stack to avoid going back to email verification
  (navigation as any).reset({
    index: 0,
    routes: [{ name: nextRoute }],
  });
};