import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys Enum
export enum KeyForStorage {
  // Auth tokens
  accessToken = 'accessToken',
  refreshToken = 'refreshToken',
  providerAccessToken = "providerAccessToken",
  tokenType = 'tokenType', // 'LIMITED' or 'FULL' - for provider two-tier authentication
  
  // User info
  userInfo = 'userInfo',
  isAuthenticated = 'isAuthenticated',
  userType = 'userType',
  userId = 'userId',
  userEmail = 'userEmail',
  userName = 'userName',
  
  // Provider info
  providerInfo = 'providerInfo',
  
  // Admin info
  adminToken = 'adminToken',
  adminRefreshToken = 'adminRefreshToken',
  adminInfo = 'adminInfo',
  providerId = 'providerId',
  providerType = 'providerType',
  providerApprovalStatus = 'providerApprovalStatus',
  
  // App state
  onboardingComplete = 'onboardingComplete',
  roleSelected = 'roleSelected',
  selectedRole = 'selectedRole',
  providerSelected = 'providerSelected',
  selectedProvider = 'selectedProvider',
  
  // Settings
  rememberMe = 'rememberMe',
  lastLoginDate = 'lastLoginDate',
  deviceId = 'deviceId',
  fcmToken = 'fcmToken',
  appLanguage = 'appLanguage',
  themeMode = 'themeMode',
  
  // Profile completion
  profileComplete = 'profileComplete',
  profileStep = 'profileStep',
  
  // Temporary credentials for auto-login
  tempEmail = 'tempEmail',
  tempPassword = 'tempPassword',
  tempUserType = 'tempUserType',
  
  // Signup temporary data
  signUpDate = 'signUpDate',
  signUpToken = 'signUpToken',
  signUpUser = 'signUpUser',
  
  // Provider pending documents (stored locally until admin approval)
  pendingProviderDocuments = 'pendingProviderDocuments',
  pendingProviderInfo = 'pendingProviderInfo',
  
  // ✅ Provider temp credentials for PersonalInfo submission (after email verification)
  providerTempPassword = 'providerTempPassword',
  providerTempEmail = 'providerTempEmail',
}

/**
 * ✅ Helper to check if a value is a valid non-null string
 */
const isValidStringValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return false;
  
  const invalidStrings = ['null', 'undefined', ''];
  return !invalidStrings.includes(value.trim().toLowerCase());
};

/**
 * Save data to AsyncStorage
 * ✅ FIX: Prevent saving null/undefined values
 */
export const saveData = async (
  key: KeyForStorage | string,
  value: any
): Promise<boolean> => {
  try {
    // ✅ FIX: Don't save null/undefined values - remove key instead
    if (value === null || value === undefined) {
      console.warn(`⚠️ Attempted to save null/undefined to ${key}, removing key instead`);
      await AsyncStorage.removeItem(key);
      return true;
    }
    
    // ✅ FIX: Don't save string "null" or "undefined"
    if (typeof value === 'string' && ['null', 'undefined'].includes(value.toLowerCase())) {
      console.warn(`⚠️ Attempted to save string "${value}" to ${key}, removing key instead`);
      await AsyncStorage.removeItem(key);
      return true;
    }
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
    console.log(`✅ Saved ${key} to storage`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${key} to storage:`, error);
    return false;
  }
};

/**
 * Retrieve data from AsyncStorage
 * ✅ FIX: Properly handle null-like values
 */
export const retrieveData = async (key: KeyForStorage | string): Promise<any> => {
  try {
    const value = await AsyncStorage.getItem(key);
    
    // ✅ FIX: Check for null/undefined from storage
    if (value === null || value === undefined) {
      console.log(`📭 No value found for ${key}`);
      return null;
    }
    
    // ✅ FIX: Check for string representations of null
    if (value === 'null' || value === 'undefined' || value === '') {
      console.log(`📭 Invalid string value "${value}" found for ${key}, treating as null`);
      // Clean up the invalid value
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      
      // ✅ FIX: If parsed result is null, return null (handles JSON "null")
      if (parsed === null || parsed === undefined) {
        console.log(`📭 Parsed null/undefined for ${key}, treating as null`);
        return null;
      }
      
      return parsed;
    } catch {
      // Not valid JSON, return as string
      return value;
    }
  } catch (error) {
    console.error(`❌ Error getting ${key} from storage:`, error);
    return null;
  }
};

// Aliases for backward compatibility
export const getData = retrieveData;
export const retriveData = retrieveData; // Keep typo alias for backward compatibility

/**
 * Remove data from AsyncStorage
 */
export const removeData = async (
  key: KeyForStorage | string
): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ Removed ${key} from storage`);
    return true;
  } catch (error) {
    console.error(`❌ Error removing ${key} from storage:`, error);
    return false;
  }
};

export const removeKey = removeData;

/**
 * Clear all data from AsyncStorage
 */
export const clearAllData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    console.log('🗑️ Cleared all storage');
    return true;
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    return false;
  }
};

/**
 * Save multiple items to AsyncStorage
 */
export const saveMultipleData = async (
  items: Array<[KeyForStorage | string, any]>
): Promise<boolean> => {
  try {
    // ✅ FIX: Filter out null/undefined values
    const validItems = items.filter(([key, value]) => {
      if (value === null || value === undefined) {
        console.warn(`⚠️ Skipping null/undefined value for ${key}`);
        return false;
      }
      return true;
    });
    
    const stringifiedItems = validItems.map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]);
    
    if (stringifiedItems.length > 0) {
      await AsyncStorage.multiSet(stringifiedItems as any);
      console.log('✅ Saved multiple items to storage');
    }
    return true;
  } catch (error) {
    console.error('❌ Error saving multiple items to storage:', error);
    return false;
  }
};

/**
 * Save user information to AsyncStorage
 */
export const saveUserInfo = async (user: any): Promise<boolean> => {
  try {
    if (!user) {
      console.warn('⚠️ Attempted to save null/undefined user info');
      return false;
    }
    
    await saveData(KeyForStorage.userInfo, user);
    
    if (user.id || user._id) {
      await saveData(KeyForStorage.userId, user.id || user._id);
    }
    if (user.email) {
      await saveData(KeyForStorage.userEmail, user.email);
    }
    if (user.fullName || user.name) {
      await saveData(KeyForStorage.userName, user.fullName || user.name);
    }
    
    console.log('✅ Saved user info to storage');
    return true;
  } catch (error) {
    console.error('❌ Error saving user info to storage:', error);
    return false;
  }
};

/**
 * Get user information from AsyncStorage
 */
export const getUserInfo = async (): Promise<any> => {
  try {
    const user = await getData(KeyForStorage.userInfo);
    return user;
  } catch (error) {
    console.error('❌ Error getting user info from storage:', error);
    return null;
  }
};

/**
 * ✅ Robust token validation function
 */
export const isValidToken = (token: any): boolean => {
  if (token === null || token === undefined) return false;
  if (typeof token !== 'string') return false;
  
  const invalidStringValues = ['null', 'undefined', '', 'false', '0'];
  if (invalidStringValues.includes(token.trim().toLowerCase())) return false;
  
  // JWT tokens are typically 100+ chars, but we use a more lenient check
  if (token.trim().length < 10) return false;
  
  return true;
};

/**
 * ✅ Save access token with validation
 */
export const saveAccessToken = async (token: string): Promise<boolean> => {
  try {
    // Validate token before saving
    if (!isValidToken(token)) {
      console.error('❌ Invalid token provided to saveAccessToken:', token);
      return false;
    }
    
    await AsyncStorage.setItem(KeyForStorage.accessToken, token);
    console.log('✅ Saved access token to storage');
    return true;
  } catch (error) {
    console.error('❌ Error saving access token:', error);
    return false;
  }
};

/**
 * ✅ Get access token with validation
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    // Try main access token first
    let token = await AsyncStorage.getItem(KeyForStorage.accessToken);
    
    // Fallback to provider-specific token
    if (!isValidToken(token)) {
      token = await AsyncStorage.getItem(KeyForStorage.providerAccessToken);
    }
    
    // Validate retrieved token
    if (!isValidToken(token)) {
      console.log('📭 No valid access token found');
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
};

/**
 * ✅ Get refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(KeyForStorage.refreshToken);
    
    if (!isValidToken(token)) {
      console.log('📭 No valid refresh token found');
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting refresh token:', error);
    return null;
  }
};

/**
 * ✅ Save auth tokens
 */
export const saveAuthTokens = async (accessToken: string, refreshToken?: string): Promise<boolean> => {
  try {
    if (!isValidToken(accessToken)) {
      console.error('❌ Invalid access token provided to saveAuthTokens');
      return false;
    }
    
    await AsyncStorage.setItem(KeyForStorage.accessToken, accessToken);
    
    if (refreshToken && isValidToken(refreshToken)) {
      await AsyncStorage.setItem(KeyForStorage.refreshToken, refreshToken);
    }
    
    console.log('✅ Saved auth tokens to storage');
    return true;
  } catch (error) {
    console.error('❌ Error saving auth tokens:', error);
    return false;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const authStatus = await getData(KeyForStorage.isAuthenticated);
    const accessToken = await getAccessToken(); // ✅ Use validated getter
    return authStatus === true && !!accessToken;
  } catch (error) {
    console.error('❌ Error checking authentication status:', error);
    return false;
  }
};

/**
 * Check if onboarding is complete
 */
export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    const complete = await getData(KeyForStorage.onboardingComplete);
    return complete === true || complete === 'true';
  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Set onboarding complete status
 */
export const setOnboardingComplete = async (complete: boolean): Promise<boolean> => {
  try {
    await saveData(KeyForStorage.onboardingComplete, complete);
    console.log('✅ Set onboarding complete:', complete);
    return true;
  } catch (error) {
    console.error('❌ Error setting onboarding complete:', error);
    return false;
  }
};

/**
 * Get selected role from storage
 */
export const getSelectedRole = async (): Promise<'user' | 'provider' | null> => {
  try {
    const role = await getData(KeyForStorage.selectedRole);
    if (role === 'user' || role === 'provider') {
      return role;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting selected role:', error);
    return null;
  }
};

/**
 * Save selected role to storage
 */
export const saveSelectedRole = async (role: 'user' | 'provider'): Promise<boolean> => {
  try {
    await saveData(KeyForStorage.selectedRole, role);
    console.log('✅ Saved selected role:', role);
    return true;
  } catch (error) {
    console.error('❌ Error saving selected role:', error);
    return false;
  }
};

/**
 * ✅ IMPROVED: Clear all authentication data (logout)
 * This clears ALL auth-related data to ensure a clean state
 */
export const clearAuthData = async (): Promise<boolean> => {
  try {
    console.log('🧹 Clearing all authentication data...');
    
    // Core auth tokens
    await removeData(KeyForStorage.accessToken);
    await removeData(KeyForStorage.refreshToken);
    await removeData(KeyForStorage.providerAccessToken);
    
    // Auth status
    await removeData(KeyForStorage.isAuthenticated);
    await removeData(KeyForStorage.userType);
    await removeData(KeyForStorage.selectedRole);
    
    // User data
    await removeData(KeyForStorage.userInfo);
    await removeData(KeyForStorage.userId);
    await removeData(KeyForStorage.userEmail);
    await removeData(KeyForStorage.userName);
    
    // Provider data
    await removeData(KeyForStorage.providerInfo);
    await removeData(KeyForStorage.providerId);
    await removeData(KeyForStorage.providerType);
    await removeData(KeyForStorage.providerApprovalStatus);
    
    // Admin data
    await removeData(KeyForStorage.adminToken);
    await removeData(KeyForStorage.adminRefreshToken);
    await removeData(KeyForStorage.adminInfo);
    
    // Signup temporary data
    await removeData(KeyForStorage.signUpDate);
    await removeData(KeyForStorage.signUpToken);
    await removeData(KeyForStorage.signUpUser);
    
    // Session data
    await removeData(KeyForStorage.lastLoginDate);
    await removeData('personalInfoSession');
    
    console.log('🗑️ Cleared all auth data successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    return false;
  }
};

/**
 * ✅ Clear temp credentials after successful login
 */
export const clearTempCredentials = async (): Promise<boolean> => {
  try {
    console.log('🧹 Clearing temporary credentials...');
    await removeData(KeyForStorage.tempEmail);
    await removeData(KeyForStorage.tempPassword);
    await removeData(KeyForStorage.tempUserType);
    await removeData(KeyForStorage.providerTempEmail);
    await removeData(KeyForStorage.providerTempPassword);
    console.log('✅ Temp credentials cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing temp credentials:', error);
    return false;
  }
};

/**
 * ✅ Get provider temp credentials for auto-login
 */
export const getProviderTempCredentials = async (): Promise<{
  email: string | null;
  password: string | null;
}> => {
  try {
    // Try provider-specific keys first
    let email = await retrieveData(KeyForStorage.providerTempEmail);
    let password = await retrieveData(KeyForStorage.providerTempPassword);
    
    // Fallback to generic temp keys
    if (!email) {
      email = await retrieveData(KeyForStorage.tempEmail);
    }
    if (!password) {
      password = await retrieveData(KeyForStorage.tempPassword);
    }
    
    console.log('📦 Retrieved provider temp credentials:', { 
      hasEmail: !!email, 
      hasPassword: !!password 
    });
    
    return { email, password };
  } catch (error) {
    console.error('❌ Error getting provider temp credentials:', error);
    return { email: null, password: null };
  }
};

/**
 * ✅ Debug function to print all storage contents
 */
export const debugPrintStorage = async (): Promise<void> => {
  try {
    console.log('📦 ===== STORAGE DEBUG START =====');
    const keys = await AsyncStorage.getAllKeys();
    console.log('📦 Total keys:', keys.length);
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      const displayValue = value 
        ? (value.length > 50 ? `${value.substring(0, 50)}... (${value.length} chars)` : value)
        : 'NULL';
      console.log(`  ${key}: ${displayValue}`);
    }
    console.log('📦 ===== STORAGE DEBUG END =====');
  } catch (error) {
    console.error('❌ Error debugging storage:', error);
  }
};

export default {
  saveData,
  getData,
  retrieveData,
  retriveData,
  removeData,
  removeKey,
  clearAllData,
  saveMultipleData,
  saveUserInfo,
  getUserInfo,
  saveAccessToken,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
  isValidToken,
  isAuthenticated,
  isOnboardingComplete,
  setOnboardingComplete,
  getSelectedRole,
  saveSelectedRole,
  clearAuthData,
  clearTempCredentials,
  getProviderTempCredentials,
  debugPrintStorage,
  KeyForStorage,
};