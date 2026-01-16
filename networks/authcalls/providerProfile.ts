import { API } from "../network/network";
import { retriveData, saveData, KeyForStorage } from "../../utils/storage_utils/storageUtils";
import type { PersonalInfoData } from "../../models/provider";

/**
 * Document file structure for upload
 */
interface DocumentForUpload {
  uri: string;
  name: string;
  type: string;
  documentType: 'medicalLicense' | 'degreeCertificate' | 'nationalIdCard' | 'professionalCertificate' | 'businessLicense';
}

/**
 * ✅ MAIN FUNCTION: Submit Provider Profile with Documents for Admin Review
 * POST /api/admin/provider-submissions
 * Content-Type: multipart/form-data
 * 
 * ✅ NO AUTHENTICATION REQUIRED
 * This endpoint allows providers to submit their profile after email verification
 * WITHOUT needing to login first (since they can't login until admin approval)
 * 
 * Flow:
 * 1. Provider signs up → emailVerified='pending', adminVerified='pending'
 * 2. Email verification → emailVerified='active'
 * 3. Submit profile HERE → status='pending_review' (NO AUTH NEEDED)
 * 4. Admin approves → adminVerified='active'
 * 5. Provider can now login
 */
export const submitProviderProfileWithDocuments = async (
  personalInfo: PersonalInfoData,
  documents: DocumentForUpload[]
) => {
  try {
    console.log('🔍 === SUBMIT TO ADMIN FOR REVIEW (NO AUTH) ===');
    console.log('📤 Submitting provider profile to admin for review');
    console.log('📄 Documents to upload:', documents.length);
    console.log('📋 Personal info:', {
      providerType: personalInfo.providerType,
      email: personalInfo.email,
      fullName: personalInfo.fullName,
    });

    // Create FormData for multipart upload
    const formData = new FormData();

    // Add all personal info fields
    if (personalInfo.providerType) formData.append('providerType', personalInfo.providerType);
    if (personalInfo.providerSubType) formData.append('providerSubType', personalInfo.providerSubType);
    if (personalInfo.fullName) formData.append('fullName', personalInfo.fullName);
    if (personalInfo.email) formData.append('email', personalInfo.email);
    if (personalInfo.phoneNumber) formData.append('phoneNumber', personalInfo.phoneNumber);
    if (personalInfo.specialty) formData.append('specialty', personalInfo.specialty);
    if (personalInfo.professionalName) formData.append('professionalName', personalInfo.professionalName);
    if (personalInfo.profession) formData.append('profession', personalInfo.profession);
    if (personalInfo.experience) formData.append('experience', personalInfo.experience);
    if (personalInfo.rate) formData.append('rate', personalInfo.rate);
    if (personalInfo.briefDescription) formData.append('briefDescription', personalInfo.briefDescription);
    if (personalInfo.city) formData.append('city', personalInfo.city);
    if (personalInfo.idNumber) formData.append('idNumber', personalInfo.idNumber);
    if (personalInfo.category) formData.append('category', personalInfo.category);
    if (personalInfo.businessName) formData.append('businessName', personalInfo.businessName);

    // Add all documents
    for (const doc of documents) {
      console.log(`📎 Adding document: ${doc.documentType} - ${doc.name}`);
      formData.append(doc.documentType, {
        uri: doc.uri,
        name: doc.name,
        type: doc.type,
      } as any);
    }

    console.log('📤 Making API request to: admin/provider-submissions');
    console.log('📤 Content-Type: multipart/form-data');
    console.log('📤 NO Authorization header (unauthenticated endpoint)');
    
    // ✅ Submit to ADMIN endpoint (NO authentication required)
    const response = await API.POST({
      URL: "admin/provider-submissions",
      headers: {
        'Content-Type': 'multipart/form-data',
        // ✅ NO Authorization header - this is an unauthenticated endpoint
      },
      data: formData,
    });

    console.log('✅ Submission sent to admin for review');
    console.log('✅ Response:', response.data);
    console.log('🔍 === SUBMIT TO ADMIN COMPLETE ===');

    return {
      success: response.data.success,
      message: response.data.message || 'Submitted for admin review',
      submissionId: response.data.submissionId,
      status: response.data.status || 'pending_review',
    };
  } catch (e: any) {
    console.error("❌ === SUBMIT PROVIDER PROFILE ERROR ===");
    console.error("❌ Error:", e.message);
    console.error("❌ Response data:", e.response?.data);
    console.error("❌ Status code:", e.response?.status);
    
    const errorMessage = e.response?.data?.message || 
                        e.response?.data?.error ||
                        e.message || 
                        "Failed to submit profile";
    
    throw new Error(errorMessage);
  }
};

/**
 * Check Provider Approval Status (Unauthenticated)
 * GET /api/provider/approval-status?email=xxx
 * 
 * ✅ NO AUTHENTICATION REQUIRED
 * Returns current approval status for a provider by email
 */
export const checkProviderApprovalStatus = async (email: string) => {
  try {
    console.log('🔍 Checking provider approval status for:', email);
    
    const response = await API.GET({
      URL: `provider/approval-status`,
      params: {
        email: email.trim().toLowerCase()
      },
      // ✅ NO Authorization header - this is an unauthenticated endpoint
    });
    
    console.log('✅ Approval status response:', response.data);
    
    return {
      success: response.data.success,
      status: response.data.status, // pending_review, approved, rejected
      message: response.data.message,
      provider: response.data.provider,
      submittedAt: response.data.submittedAt,
      approvedAt: response.data.approvedAt,
      rejectedAt: response.data.rejectedAt,
      rejectionReason: response.data.rejectionReason,
    };
  } catch (e: any) {
    console.error("❌ Check approval status error:", e);
    console.error("❌ Response:", e.response?.data);
    throw new Error(e.response?.data?.message || "Failed to check approval status");
  }
};

// ============================================================
// AUTHENTICATED ENDPOINTS (Only work after admin approval)
// ============================================================

/**
 * Get Provider Token (for authenticated endpoints)
 * Only works after admin approval
 */
const getProviderToken = async () => {
  try {
    console.log("🔍 Getting provider token...");
    
    let token = await retriveData(KeyForStorage.accessToken);
    
    if (!token) {
      token = await retriveData(KeyForStorage.providerAccessToken);
    }
    
    if (!token) {
      console.error("❌ No authentication token found!");
      throw new Error("No authentication token found. Please login first.");
    }
    
    if (typeof token !== 'string' || token.length < 10) {
      console.error("❌ Invalid token format:", token);
      throw new Error("Invalid authentication token.");
    }
    
    console.log("✅ Valid token found");
    return token;
  } catch (error) {
    console.error("❌ Failed to get provider token:", error);
    throw error;
  }
};

/**
 * Provider Login (After admin approval)
 * POST /api/auth/provider/login
 * 
 * ✅ Only works when BOTH:
 * - emailVerified = 'active'
 * - adminVerified = 'active'
 */
export const loginProvider = async (email: string, password: string) => {
  try {
    console.log('📤 Logging in provider...');
    console.log('📧 Email:', email);

    const response = await API.POST({
      URL: "auth/provider/login",
      headers: {
        'Content-Type': 'application/json',
      },
      data: { 
        email: email.trim().toLowerCase(), 
        password 
      },
    });

    console.log('✅ Provider logged in successfully');
    console.log('📊 Token type:', response.data.tokenType);
    console.log('📊 Onboarding status:', response.data.onboardingStatus);

    // Save tokens
    if (response.data.accessToken) {
      await saveData(KeyForStorage.accessToken, response.data.accessToken);
      await saveData(KeyForStorage.providerAccessToken, response.data.accessToken);
      await saveData(KeyForStorage.isAuthenticated, true);
      await saveData(KeyForStorage.userType, 'provider');
      console.log('✅ Provider tokens saved');
    }

    return response.data;
  } catch (e: any) {
    console.error("❌ Provider login error:", e);
    console.error("❌ Response:", e.response?.data);
    
    // Handle specific error codes
    const errorData = e.response?.data;
    let errorMessage = errorData?.message || e.message || "Login failed";
    
    if (errorData?.error === 'EMAIL_NOT_VERIFIED') {
      errorMessage = "Please verify your email first.";
    } else if (errorData?.error === 'ACCOUNT_NOT_APPROVED') {
      errorMessage = "Your account is pending admin approval.";
    } else if (errorData?.error === 'ACCOUNT_REJECTED') {
      errorMessage = errorData?.rejectionReason 
        ? `Your application was rejected: ${errorData.rejectionReason}`
        : "Your application was rejected. Please contact support.";
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Get Provider Profile (Authenticated)
 * GET /api/providers/profile
 * 
 * ✅ Requires authentication (only works after admin approval)
 */
export const getProviderProfile = async (providerId?: string) => {
  try {
    const token = await getProviderToken();

    console.log('📤 Fetching provider profile');

    const url = providerId 
      ? `/providers/${providerId}` 
      : "providers/profile";

    const response = await API.GET({
      URL: url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Provider profile fetched');

    return {
      success: response.data.success,
      provider: response.data.provider,
    };
  } catch (e: any) {
    console.error("❌ Get provider profile error:", e);
    throw new Error(e.response?.data?.message || "Failed to fetch profile");
  }
};

/**
 * Update Provider Profile (Authenticated)
 * PUT /api/provider/profile
 * 
 * ✅ Requires authentication (only works after admin approval)
 */
export const updateProviderProfile = async (updates: Partial<PersonalInfoData>) => {
  try {
    const token = await getProviderToken();

    console.log('📤 Updating provider profile');

    const response = await API.PUT({
      URL: "provider/profile",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: updates,
    });

    console.log('✅ Provider profile updated');

    return {
      success: response.data.success,
      message: response.data.message,
      provider: response.data.provider,
    };
  } catch (e: any) {
    console.error("❌ Update provider profile error:", e);
    throw new Error(e.response?.data?.message || "Failed to update profile");
  }
};

/**
 * Upload Provider Document (Authenticated)
 * POST /api/providers/upload-document
 * 
 * ✅ Requires authentication (only works after admin approval)
 */
export const uploadProviderDocument = async (
  documentUri: string,
  fileName: string,
  fileType: string,
  documentType: 'medicalLicense' | 'degreeCertificate' | 'nationalIdCard' | 'professionalCertificate' | 'businessLicense'
) => {
  try {
    const token = await getProviderToken();

    console.log('📤 Uploading provider document:', documentType);

    const formData = new FormData();
    formData.append('document', {
      uri: documentUri,
      name: fileName,
      type: fileType,
    } as any);
    formData.append('documentType', documentType);

    const response = await API.POST({
      URL: "providers/upload-document",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      data: formData,
    });

    console.log('✅ Document uploaded');

    return {
      success: response.data.success,
      message: response.data.message,
      documentType: response.data.documentType,
    };
  } catch (e: any) {
    console.error("❌ Upload document error:", e);
    throw new Error(e.response?.data?.message || "Failed to upload document");
  }
};

/**
 * Get Provider Verification Status (Authenticated)
 * GET /api/providers/verification
 * 
 * ✅ Requires authentication (only works after admin approval)
 */
export const getProviderVerificationStatus = async () => {
  try {
    const token = await getProviderToken();

    console.log('📤 Fetching provider verification status');

    const response = await API.GET({
      URL: "providers/verification",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Verification status fetched');

    return {
      success: response.data.success,
      verificationStatus: response.data.verificationStatus,
      isVerified: response.data.isVerified,
      rejectionReason: response.data.rejectionReason || null,
      documents: response.data.documents,
    };
  } catch (e: any) {
    console.error("❌ Get verification status error:", e);
    throw new Error(e.response?.data?.message || "Failed to fetch verification status");
  }
};

/**
 * Persist FCM Token for Provider (Authenticated)
 */
export const persistProviderFcmToken = async (fcmToken: string, deviceType: string) => {
  try {
    const token = await getProviderToken();

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

    console.log('✅ FCM token persisted');

    return response.data;
  } catch (e: any) {
    console.error("❌ FCM token persistence error:", e);
    throw new Error(e.message);
  }
};