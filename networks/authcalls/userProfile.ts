import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from "../network/network";
import { retrieveData, KeyForStorage } from "../../utils/storage_utils/storageUtils";
import { ProfileCompletionData } from "../../models/user";

// API Base URL
const API_BASE_URL = 'https://metromatrix-api-2e35f5f074df.herokuapp.com/api';

// Error codes from backend
export const UPLOAD_ERROR_CODES = {
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  NO_FILE: 'NO_FILE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
} as const;

// Allowed file types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (updated to match backend)

/**
 * Helper function to validate token
 */
const validateToken = (token: any): token is string => {
  if (token === null || token === undefined) return false;
  if (typeof token !== 'string') return false;
  
  const invalidValues = ['null', 'undefined', '', 'false'];
  if (invalidValues.includes(token.trim().toLowerCase())) return false;
  
  // JWT tokens are typically 100+ characters
  if (token.trim().length < 10) return false;
  
  return true;
};

/**
 * Debug function to print all storage keys
 */
const debugPrintStorage = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('📦 All storage keys:', keys);
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      const displayValue = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'NULL';
      console.log(`  ${key}: ${displayValue}`);
    }
  } catch (error) {
    console.error('❌ Error debugging storage:', error);
  }
};

/**
 * Validate file before upload
 */
const validateFile = (fileType: string, fileSize: number): { valid: boolean; error?: string; code?: string } => {
  // Check file type
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: JPEG, PNG, GIF, WebP`,
      code: UPLOAD_ERROR_CODES.INVALID_FILE_TYPE,
    };
  }

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
      code: UPLOAD_ERROR_CODES.FILE_SIZE_EXCEEDED,
    };
  }

  return { valid: true };
};

/**
 * Get User Profile
 * GET /users/profile
 */
export const getUserProfile = async () => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Fetching user profile');
    console.log('🔑 Token available:', validateToken(token));

    const response = await API.GET({
      URL: "users/profile",
      headers: {},
    });

    console.log('✅ User profile fetched');

    return response.data.user;
  } catch (e: any) {
    console.error("❌ Get user profile error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to fetch profile");
  }
};

/**
 * Update User Profile
 * PUT /users/profile
 */
export const updateUserProfile = async (updates: {
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}) => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Updating user profile');
    console.log('🔑 Token valid:', validateToken(token));

    const response = await API.PUT({
      URL: "users/profile",
      headers: {
        'Content-Type': 'application/json',
      },
      data: updates,
    });

    console.log('✅ Profile updated successfully');

    return {
      success: response.data.success,
      user: response.data.user,
    };
  } catch (e: any) {
    console.error("❌ Update profile error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to update profile";
    
    throw new Error(errorMessage);
  }
};

/**
 * Complete Profile - Step 1 (Personal Info)
 * POST /users/complete-profile
 * Body: {step: 1, data: {dateOfBirth, gender}}
 */
export const completeProfileStep1 = async (data: {
  dateOfBirth: string;
  gender: string;
}) => {
  try {
    console.log('📤 Completing profile step 1 (Personal Info)');
    console.log('🔍 Debug: Checking storage...');
    await debugPrintStorage();

    const token = await retrieveData(KeyForStorage.accessToken);
    
    console.log('🔑 Token retrieved:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    console.log('🔑 Token type:', typeof token);
    console.log('🔑 Token valid:', validateToken(token));

    if (!validateToken(token)) {
      console.error('❌ Invalid or missing token! Cannot complete profile step 1.');
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await API.POST({
      URL: "users/complete-profile",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        step: 1,
        data: {
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
        },
      },
    });

    console.log('✅ Profile step 1 completed successfully');

    return {
      success: response.data.success,
      message: response.data.message,
      profileCompletionStep: response.data.profileCompletionStep,
      nextStep: response.data.nextStep,
      user: response.data.user,
    };
  } catch (e: any) {
    console.error("❌ Complete profile step 1 error:", e);
    console.error("Error response data:", e.response?.data);
    
    const errorMessage = e.response?.data?.message || 
                        e.response?.data?.error ||
                        e.message || 
                        "Failed to complete profile step 1";
    
    throw new Error(errorMessage);
  }
};

/**
 * Complete Profile - Step 2 (Address)
 * POST /users/complete-profile
 * Body: {step: 2, data: {address: {street, city, postalCode, country}}}
 */
export const completeProfileStep2 = async (data: {
  street: string;
  city: string;
  postalCode: string;
  country?: string;
}) => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Completing profile step 2 (Address)');
    console.log('🔑 Token valid:', validateToken(token));

    if (!validateToken(token)) {
      console.error('❌ Invalid or missing token! Cannot complete profile step 2.');
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await API.POST({
      URL: "users/complete-profile",
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        step: 2,
        data: {
          address: {
            street: data.street,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country || 'Pakistan',
          },
        },
      },
    });

    console.log('✅ Profile step 2 completed successfully');

    return {
      success: response.data.success,
      message: response.data.message,
      profileCompletionStep: response.data.profileCompletionStep,
      nextStep: response.data.nextStep,
      user: response.data.user,
    };
  } catch (e: any) {
    console.error("❌ Complete profile step 2 error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.response?.data?.error ||
                        e.message || 
                        "Failed to complete profile step 2";
    
    throw new Error(errorMessage);
  }
};

/**
 * Upload Profile Photo - IMPROVED VERSION
 * POST /users/upload-photo
 * Body: FormData {photo: image}
 * 
 * Response includes:
 * - profilePhoto: URL of the uploaded photo
 * - profilePhotoUrl: Same as profilePhoto (for consistency)
 * - profilePhotoId: Cloudinary ID for reference
 * - user: Updated user object
 */
export interface UploadPhotoResponse {
  success: boolean;
  message: string;
  profilePhoto: string;
  profilePhotoUrl: string;
  profilePhotoId: string;
  user: any;
}

export const uploadProfilePhoto = async (
  photoUri: string,
  fileName: string = 'profile-photo.jpg',
  fileType: string = 'image/jpeg',
  fileSize: number = 0
): Promise<UploadPhotoResponse> => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Uploading profile photo');
    console.log('Photo details:', { 
      uri: photoUri.substring(0, 50) + '...', 
      name: fileName, 
      type: fileType,
      size: fileSize 
    });

    // Validate token
    if (!validateToken(token)) {
      console.error('❌ Invalid or missing token! Cannot upload photo.');
      const error = new Error('Authentication required. Please log in again.');
      (error as any).code = UPLOAD_ERROR_CODES.AUTH_REQUIRED;
      throw error;
    }

    // Validate file before upload (if we have file info)
    if (fileType || fileSize > 0) {
      const validation = validateFile(fileType, fileSize);
      if (!validation.valid) {
        console.error('❌ File validation failed:', validation.error);
        const error = new Error(validation.error);
        (error as any).code = validation.code;
        throw error;
      }
    }

    // Create FormData
    const formData = new FormData();
    
    // Format file for React Native
    const file: any = {
      uri: Platform.OS === 'android' ? photoUri : photoUri.replace('file://', ''),
      name: fileName,
      type: fileType || 'image/jpeg',
    };

    // Backend expects field name 'photo'
    formData.append('photo', file);

    console.log('📤 Sending photo upload request via fetch to:', `${API_BASE_URL}/users/upload-photo`);

    // Use fetch for FormData (better handling of multipart/form-data)
    const response = await fetch(`${API_BASE_URL}/users/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // DO NOT set Content-Type - let fetch set it automatically with boundary
      },
      body: formData,
    });

    console.log('📥 Response status:', response.status);

    // Parse response
    const responseData = await response.json();
    console.log('📥 Response data:', JSON.stringify(responseData, null, 2));

    // Handle error responses
    if (!response.ok || !responseData.success) {
      const errorCode = responseData.code || UPLOAD_ERROR_CODES.UPLOAD_ERROR;
      const error = new Error(responseData.message || responseData.error || 'Photo upload failed');
      (error as any).code = errorCode;
      throw error;
    }

    console.log('✅ Profile photo uploaded successfully');
    console.log('📸 Photo URL:', responseData.profilePhoto || responseData.profilePhotoUrl);
    console.log('🆔 Photo ID:', responseData.profilePhotoId);

    return {
      success: responseData.success,
      message: responseData.message || 'Photo uploaded successfully',
      profilePhoto: responseData.profilePhoto || responseData.profilePhotoUrl,
      profilePhotoUrl: responseData.profilePhotoUrl || responseData.profilePhoto,
      profilePhotoId: responseData.profilePhotoId || '',
      user: responseData.user,
    };
  } catch (e: any) {
    console.error("❌ Upload profile photo error:", e);
    console.error("Error details:", {
      message: e.message,
      code: e.code,
      response: e.response?.data,
    });

    // Preserve error code if already set
    if (!e.code) {
      e.code = UPLOAD_ERROR_CODES.UPLOAD_ERROR;
    }
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to upload profile photo";
    
    const error = new Error(errorMessage);
    (error as any).code = e.code;
    throw error;
  }
};

/**
 * Complete Profile Step 3 (Photo Upload)
 * Wrapper for uploadProfilePhoto for step-based flow
 */
export const completeProfileStep3 = async (
  photoUri: string,
  fileName: string = 'profile-photo.jpg',
  fileType: string = 'image/jpeg',
  fileSize: number = 0
): Promise<UploadPhotoResponse> => {
  return uploadProfilePhoto(photoUri, fileName, fileType, fileSize);
};

/**
 * Complete All Profile Steps Sequentially
 * Executes steps 1, 2, and optionally photo upload
 */
export const completeUserProfile = async (profileData: ProfileCompletionData) => {
  try {
    console.log('📤 Starting complete profile process');

    // Validate token before starting the process
    const token = await retrieveData(KeyForStorage.accessToken);
    if (!validateToken(token)) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Step 1: Personal Info (dateOfBirth, gender)
    const step1Result = await completeProfileStep1({
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
    });
    console.log('✅ Step 1 completed:', step1Result.message);

    // Step 2: Address (street, city, postalCode)
    const step2Result = await completeProfileStep2({
      street: profileData.address.street,
      city: profileData.address.city,
      postalCode: profileData.address.postalCode,
    });
    console.log('✅ Step 2 completed:', step2Result.message);

    // Step 3: Photo Upload (optional - separate endpoint)
    let photoResult = null;
    if (profileData.profilePhoto) {
      try {
        photoResult = await uploadProfilePhoto(
          profileData.profilePhoto,
          'profile-photo.jpg',
          'image/jpeg'
        );
        console.log('✅ Step 3 (photo) completed:', photoResult.message);
        console.log('📸 Profile photo URL:', photoResult.profilePhotoUrl);
      } catch (photoError: any) {
        console.log('⚠️ Photo upload failed but continuing:', photoError.message);
        console.log('⚠️ Error code:', photoError.code);
        // Don't fail entire process if photo upload fails
      }
    }

    console.log('✅ Complete profile process finished');

    // Return the most recent user data
    return {
      success: true,
      message: 'Profile completed successfully',
      user: photoResult?.user || step2Result.user,
      profilePhotoUrl: photoResult?.profilePhotoUrl,
      profilePhotoId: photoResult?.profilePhotoId,
    };
  } catch (e: any) {
    console.error("❌ Complete profile error:", e);
    throw new Error(e.message || "Failed to complete profile");
  }
};

/**
 * Update User Preferences
 * PUT /users/preferences
 */
export const updatePreferences = async (preferences: {
  notifications?: boolean;
  language?: string;
  theme?: string;
  [key: string]: any;
}) => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Updating user preferences');
    console.log('🔑 Token valid:', validateToken(token));

    const response = await API.PUT({
      URL: "users/preferences",
      headers: {
        'Content-Type': 'application/json',
      },
      data: preferences,
    });

    console.log('✅ Preferences updated successfully');

    return {
      success: response.data.success,
      preferences: response.data.preferences,
    };
  } catch (e: any) {
    console.error("❌ Update preferences error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to update preferences";
    
    throw new Error(errorMessage);
  }
};

/**
 * Delete User Account
 * DELETE /users/account
 */
export const deleteAccount = async () => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Deleting user account');
    console.log('🔑 Token valid:', validateToken(token));

    const response = await API.DELETE({
      URL: "users/account",
      headers: {},
    });

    console.log('✅ Account deleted successfully');

    return {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (e: any) {
    console.error("❌ Delete account error:", e);
    
    const errorMessage = e.response?.data?.message || 
                        e.message || 
                        "Failed to delete account";
    
    throw new Error(errorMessage);
  }
};

/**
 * Get All Users (Admin)
 * GET /users
 */
export const getUsers = async () => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Fetching all users');
    console.log('🔑 Token valid:', validateToken(token));

    const response = await API.GET({
      URL: "users",
      headers: {},
    });

    console.log('✅ Users fetched successfully');

    return response.data.users;
  } catch (e: any) {
    console.error("❌ Get users error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to fetch users");
  }
};

/**
 * Get User By ID (Admin)
 * GET /users/:id
 */
export const getUserById = async (userId: string) => {
  try {
    const token = await retrieveData(KeyForStorage.accessToken);

    console.log('📤 Fetching user by ID:', userId);
    console.log('🔑 Token valid:', validateToken(token));

    const response = await API.GET({
      URL: `users/${userId}`,
      headers: {},
    });

    console.log('✅ User fetched successfully');

    return response.data.user;
  } catch (e: any) {
    console.error("❌ Get user by ID error:", e);
    throw new Error(e.response?.data?.message || e.message || "Failed to fetch user");
  }
};