import { saveData, getData, removeData, clearAllData, saveMultipleData, KeyForStorage } from '../storage_utils/storageUtils';

// ==================== Provider Selection Storage ====================

export type ProviderMainType = 'doctor' | 'home_service' | 'vendor';
export type HomeServiceSubType = 'electrician' | 'plumber' | 'ac_repairer';

export interface ProviderSelection {
  providerType: ProviderMainType | null;
  subTypes: HomeServiceSubType[];
  selectedAt: string;
}

/**
 * Save provider selection to storage
 * @param providerType - Main provider type
 * @param subTypes - Array of sub-types (for home_service)
 * @returns Promise<boolean> - Success status
 */
export const saveProviderSelection = async (
  providerType: ProviderMainType,
  subTypes: HomeServiceSubType[] = []
): Promise<boolean> => {
  try {
    const selection: ProviderSelection = {
      providerType,
      subTypes,
      selectedAt: new Date().toISOString(),
    };

    const success = await saveData('providerSelection', selection);
    
    if (success) {
      console.log('✅ Provider selection saved:', selection);
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error saving provider selection:', error);
    return false;
  }
};

/**
 * Load provider selection from storage
 * @returns Promise<ProviderSelection | null> - Provider selection or null
 */
export const loadProviderSelection = async (): Promise<ProviderSelection | null> => {
  try {
    const selection = await getData('providerSelection');
    
    if (selection) {
      console.log('✅ Provider selection loaded:', selection);
      return selection;
    }
    
    console.log('ℹ️ No provider selection found');
    return null;
  } catch (error) {
    console.error('❌ Error loading provider selection:', error);
    return null;
  }
};

/**
 * Clear provider selection from storage
 * @returns Promise<boolean> - Success status
 */
export const clearProviderSelection = async (): Promise<boolean> => {
  try {
    const success = await removeData('providerSelection');
    
    if (success) {
      console.log('🗑️ Provider selection cleared');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error clearing provider selection:', error);
    return false;
  }
};

// ==================== Authentication Storage ====================

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: 'provider';
  providerType?: ProviderMainType;
  providerSubType?: HomeServiceSubType;
  verified: boolean;
  profileComplete: boolean;
  profession?: string;
  emailVerified?: boolean;
  canLogin?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

/**
 * Save authentication session (sign in)
 * @param user - User data
 * @param token - Auth token
 * @param rememberMe - Remember me preference
 * @returns Promise<boolean> - Success status
 */
export const saveSignInSession = async (
  user: AuthUser,
  token: string,
  rememberMe: boolean = false
): Promise<boolean> => {
  try {
    const items: Array<[string, any]> = [
      [KeyForStorage.accessToken, token],
      [KeyForStorage.userInfo, user],
      [KeyForStorage.isAuthenticated, true],
      [KeyForStorage.rememberMe, rememberMe],
      [KeyForStorage.lastLoginDate, new Date().toISOString()],
    ];

    if (user.id) items.push([KeyForStorage.userId, user.id]);
    if (user.email) items.push([KeyForStorage.userEmail, user.email]);
    if (user.fullName) items.push([KeyForStorage.userName, user.fullName]);

    const success = await saveMultipleData(items);
    
    if (success) {
      console.log('✅ Sign-in session saved');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error saving sign-in session:', error);
    return false;
  }
};

/**
 * Load authentication session (auto sign-in)
 * @returns Promise<{user: AuthUser | null, token: string | null, rememberMe: boolean}> - Session data
 */
export const loadSignInSession = async (): Promise<{
  user: AuthUser | null;
  token: string | null;
  rememberMe: boolean;
}> => {
  try {
    const token = await getData(KeyForStorage.accessToken);
    const user = await getData(KeyForStorage.userInfo);
    const rememberMe = await getData(KeyForStorage.rememberMe);
    
    if (token && user) {
      console.log('✅ Sign-in session loaded:', user.email);
      return { user, token, rememberMe: rememberMe === true };
    }
    
    console.log('ℹ️ No sign-in session found');
    return { user: null, token: null, rememberMe: false };
  } catch (error) {
    console.error('❌ Error loading sign-in session:', error);
    return { user: null, token: null, rememberMe: false };
  }
};

/**
 * Clear sign-in session (sign out)
 * @returns Promise<boolean> - Success status
 */
export const clearSignInSession = async (): Promise<boolean> => {
  try {
    await removeData(KeyForStorage.accessToken);
    await removeData(KeyForStorage.refreshToken);
    await removeData(KeyForStorage.userInfo);
    await removeData(KeyForStorage.isAuthenticated);
    await removeData(KeyForStorage.userId);
    await removeData(KeyForStorage.userEmail);
    await removeData(KeyForStorage.userName);
    await removeData(KeyForStorage.rememberMe);
    
    console.log('🗑️ Sign-in session cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing sign-in session:', error);
    return false;
  }
};

/**
 * Update user data in storage
 * @param updates - Partial user data to update
 * @returns Promise<boolean> - Success status
 */
export const updateUserInStorage = async (updates: Partial<AuthUser>): Promise<boolean> => {
  try {
    const currentUser = await getData(KeyForStorage.userInfo);
    
    if (!currentUser) {
      console.error('❌ No user found in storage to update');
      return false;
    }
    
    const updatedUser = { ...currentUser, ...updates };
    const success = await saveData(KeyForStorage.userInfo, updatedUser);
    
    // Update individual fields if they changed
    if (updates.id) await saveData(KeyForStorage.userId, updates.id);
    if (updates.email) await saveData(KeyForStorage.userEmail, updates.email);
    if (updates.fullName) await saveData(KeyForStorage.userName, updates.fullName);
    
    if (success) {
      console.log('✅ User data updated in storage');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error updating user in storage:', error);
    return false;
  }
};

// ==================== Sign Up Storage ====================

/**
 * Save sign-up session (temporary during registration)
 * @param user - New user data
 * @param token - Temporary auth token
 * @returns Promise<boolean> - Success status
 */
export const saveSignUpSession = async (
  user: AuthUser,
  token: string
): Promise<boolean> => {
  try {
    const items: Array<[string, any]> = [
      ['signUpUser', user],
      ['signUpToken', token],
      ['signUpDate', new Date().toISOString()],
    ];

    const success = await saveMultipleData(items);
    
    if (success) {
      console.log('✅ Sign-up session saved');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error saving sign-up session:', error);
    return false;
  }
};

/**
 * Load sign-up session
 * @returns Promise<{user: AuthUser | null, token: string | null}> - Sign-up session data
 */
export const loadSignUpSession = async (): Promise<{
  user: AuthUser | null;
  token: string | null;
}> => {
  try {
    const user = await getData('signUpUser');
    const token = await getData('signUpToken');
    
    if (user && token) {
      console.log('✅ Sign-up session loaded:', user.email);
      return { user, token };
    }
    
    console.log('ℹ️ No sign-up session found');
    return { user: null, token: null };
  } catch (error) {
    console.error('❌ Error loading sign-up session:', error);
    return { user: null, token: null };
  }
};

/**
 * Clear sign-up session
 * @returns Promise<boolean> - Success status
 */
export const clearSignUpSession = async (): Promise<boolean> => {
  try {
    await removeData('signUpUser');
    await removeData('signUpToken');
    await removeData('signUpDate');
    
    console.log('🗑️ Sign-up session cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing sign-up session:', error);
    return false;
  }
};

/**
 * Convert sign-up session to sign-in session
 * (After successful registration completion)
 * @returns Promise<boolean> - Success status
 */
export const convertSignUpToSignIn = async (): Promise<boolean> => {
  try {
    const { user, token } = await loadSignUpSession();
    
    if (!user || !token) {
      console.error('❌ No sign-up session to convert');
      return false;
    }
    
    // Save as sign-in session
    await saveSignInSession(user, token, false);
    
    // Clear sign-up session
    await clearSignUpSession();
    
    console.log('✅ Converted sign-up to sign-in session');
    return true;
  } catch (error) {
    console.error('❌ Error converting sign-up to sign-in:', error);
    return false;
  }
};

// ==================== Personal Info Storage ====================

// FIXED: Added providerType to PersonalInfoData interface
export interface PersonalInfoData {
  // Provider Type - CRITICAL FIX
  providerType: 'doctor' | 'home_service' | 'vendor';
  providerSubType?: 'electrician' | 'plumber' | 'ac_repairer';
  
  // Step 1: Personal Information
  fullName: string;
  email: string;
  phoneNumber: string;

  // Step 2: Professional Details
  specialty?: string;
  professionalName?: string;
  clinicName?: string;
  profession?: string;
  experience: string;
  rate?: string;
  briefDescription: string;
  city: string;
  idNumber: string;
  category?: string;
  businessName?: string;

  // Step 3: Documents
  medicalLicense?: any;
  nationalIdCard?: any;
  degreeCertificate?: any;
  professionalCertificate?: any;
  businessLicense?: any;
}

export interface PersonalInfoSession {
  providerType: ProviderMainType;
  providerSubType: HomeServiceSubType | null;
  formData: PersonalInfoData;
  currentStep: number;
  savedAt: string;
}

/**
 * Save personal info session (form progress)
 * @param session - Personal info session data
 * @returns Promise<boolean> - Success status
 */
export const savePersonalInfoSession = async (
  session: PersonalInfoSession
): Promise<boolean> => {
  try {
    const success = await saveData('personalInfoSession', {
      ...session,
      savedAt: new Date().toISOString(),
    });
    
    if (success) {
      console.log('✅ Personal info session saved');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error saving personal info session:', error);
    return false;
  }
};

/**
 * Load personal info session
 * @returns Promise<PersonalInfoSession | null> - Personal info session or null
 */
export const loadPersonalInfoSession = async (): Promise<PersonalInfoSession | null> => {
  try {
    const session = await getData('personalInfoSession');
    
    if (session) {
      console.log('✅ Personal info session loaded');
      return session;
    }
    
    console.log('ℹ️ No personal info session found');
    return null;
  } catch (error) {
    console.error('❌ Error loading personal info session:', error);
    return null;
  }
};

/**
 * Clear personal info session
 * @returns Promise<boolean> - Success status
 */
export const clearPersonalInfoSession = async (): Promise<boolean> => {
  try {
    const success = await removeData('personalInfoSession');
    
    if (success) {
      console.log('🗑️ Personal info session cleared');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error clearing personal info session:', error);
    return false;
  }
};

// ==================== Complete Logout ====================

/**
 * Clear all authentication and user data (complete logout)
 * @returns Promise<boolean> - Success status
 */
export const completeLogout = async (): Promise<boolean> => {
  try {
    await clearSignInSession();
    await clearSignUpSession();
    await clearPersonalInfoSession();
    await clearProviderSelection();
    
    console.log('🗑️ Complete logout - all data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error during complete logout:', error);
    return false;
  }
};

// ==================== Export All ====================

export const ProviderUtils = {
  // Provider Selection
  saveProviderSelection,
  loadProviderSelection,
  clearProviderSelection,
  
  // Sign In
  saveSignInSession,
  loadSignInSession,
  clearSignInSession,
  updateUserInStorage,
  
  // Sign Up
  saveSignUpSession,
  loadSignUpSession,
  clearSignUpSession,
  convertSignUpToSignIn,
  
  // Personal Info
  savePersonalInfoSession,
  loadPersonalInfoSession,
  clearPersonalInfoSession,
  
  // Logout
  completeLogout,
};

// Export ProviderStorage object to match providerSlice usage
export const ProviderStorage = {
  saveSelection: saveProviderSelection,
  loadSelection: loadProviderSelection,
  clearSelection: clearProviderSelection,
};

export default ProviderUtils;