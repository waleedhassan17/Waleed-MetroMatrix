import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "../../../store/store";
import {
  savePersonalInfoSession,
  loadPersonalInfoSession,
  clearPersonalInfoSession,
  type PersonalInfoData,
  type PersonalInfoSession,
} from '../../../utils/provider-utils/providerUtils';
import * as DocumentPicker from 'expo-document-picker';
import { saveData, KeyForStorage, retrieveData, removeData, getAccessToken } from '../../../utils/storage_utils/storageUtils';

// Types
export type ProviderType = 'doctor' | 'home_service' | 'vendor';
export type HomeServiceSubType = 'electrician' | 'plumber' | 'ac_repairer';

// Re-export PersonalInfoData from provider_utils
export type { PersonalInfoData } from '../../../utils/provider-utils/providerUtils';

export interface DocumentFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface PersonalInfoState {
  currentStep: number;
  totalSteps: number;
  providerType: ProviderType | null;
  providerSubType: HomeServiceSubType | null;
  formData: PersonalInfoData;
  isLoading: boolean;
  error: string | null;
  isSubmitted: boolean;
  uploadProgress: {
    [key: string]: number;
  };
  verificationStatus?: {
    isVerified: boolean;
    status: string;
    documents: any[];
  };
  pendingApproval: boolean;
  providerPassword?: string;
  isAuthenticated: boolean;
}

// Initial State
const initialState: PersonalInfoState = {
  currentStep: 1,
  totalSteps: 3,
  providerType: null,
  providerSubType: null,
  formData: {
    // Provider Type
    providerType: 'doctor' as ProviderType,
    providerSubType: undefined,
    
    // Step 1: Personal Information
    fullName: '',
    email: '',
    phoneNumber: '',
    
    // Step 2: Professional Details
    specialty: '',
    category: '',
    profession: '',
    experience: '',
    briefDescription: '',
    city: '',
    idNumber: '',
    businessName: '',
    professionalName: '',
    rate: '',
  },
  isLoading: false,
  error: null,
  isSubmitted: false,
  uploadProgress: {},
  pendingApproval: false,
  providerPassword: undefined,
  isAuthenticated: false,
};

// ==================== ASYNC THUNKS ====================

/**
 * ✅ FIXED: Submit Personal Information to Admin for Review
 * 
 * FLOW:
 * 1. Provider signs up → Created in backend with emailVerified='pending', adminVerified='pending'
 * 2. Email verification → emailVerified='active', navigate to PersonalInfo (NO LOGIN)
 * 3. Submit profile → POST /api/admin/provider-submissions (NO AUTH REQUIRED)
 * 4. Admin approval → adminVerified='active'
 * 5. Provider can now login
 * 
 * ✅ KEY FIX: Using submitProviderProfileWithDocuments (unauthenticated)
 * NOT updateProviderProfileWithDocuments (requires auth)
 */
export const submitPersonalInfo = createAsyncThunk(
  'personalInfo/submit',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { formData, providerType, providerSubType } = state.personalInfo;

      console.log('📤 === STARTING PERSONAL INFO SUBMISSION ===');
      console.log('📋 Provider Type:', providerType);
      console.log('📧 Email:', formData.email);

      // Validate required fields
      if (!formData.email) {
        throw new Error('Email is required');
      }

      // ==================== PREPARE DOCUMENTS ====================
      const documentsToUpload: Array<{
        uri: string;
        name: string;
        type: string;
        documentType: 'medicalLicense' | 'degreeCertificate' | 'nationalIdCard' | 'professionalCertificate' | 'businessLicense';
      }> = [];

      // Add documents based on provider type
      if (providerType === 'doctor') {
        if (formData.medicalLicense) {
          documentsToUpload.push({
            uri: formData.medicalLicense.uri,
            name: formData.medicalLicense.name,
            type: formData.medicalLicense.type,
            documentType: 'medicalLicense',
          });
          console.log('📄 Added medicalLicense:', formData.medicalLicense.name);
        }
        if (formData.degreeCertificate) {
          documentsToUpload.push({
            uri: formData.degreeCertificate.uri,
            name: formData.degreeCertificate.name,
            type: formData.degreeCertificate.type,
            documentType: 'degreeCertificate',
          });
          console.log('📄 Added degreeCertificate:', formData.degreeCertificate.name);
        }
      }

      if (providerType === 'home_service' && formData.professionalCertificate) {
        documentsToUpload.push({
          uri: formData.professionalCertificate.uri,
          name: formData.professionalCertificate.name,
          type: formData.professionalCertificate.type,
          documentType: 'professionalCertificate',
        });
        console.log('📄 Added professionalCertificate:', formData.professionalCertificate.name);
      }

      if (providerType === 'vendor' && formData.businessLicense) {
        documentsToUpload.push({
          uri: formData.businessLicense.uri,
          name: formData.businessLicense.name,
          type: formData.businessLicense.type,
          documentType: 'businessLicense',
        });
        console.log('📄 Added businessLicense:', formData.businessLicense.name);
      }

      // Add national ID (required for all)
      if (formData.nationalIdCard) {
        documentsToUpload.push({
          uri: formData.nationalIdCard.uri,
          name: formData.nationalIdCard.name,
          type: formData.nationalIdCard.type,
          documentType: 'nationalIdCard',
        });
        console.log('📄 Added nationalIdCard:', formData.nationalIdCard.name);
      }

      console.log(`📄 Total documents to upload: ${documentsToUpload.length}`);

      // ==================== PREPARE PERSONAL INFO ====================
      const personalInfoData: PersonalInfoData = {
        providerType: providerType || formData.providerType,
        providerSubType: providerSubType || formData.providerSubType,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        specialty: formData.specialty,
        professionalName: formData.professionalName,
        profession: formData.profession,
        experience: formData.experience,
        rate: formData.rate,
        briefDescription: formData.briefDescription,
        city: formData.city,
        idNumber: formData.idNumber,
        category: formData.category,
        businessName: formData.businessName,
      };

      console.log('📋 Personal Info Data:', JSON.stringify(personalInfoData, null, 2));

      // ==================== ✅ KEY FIX: USE UNAUTHENTICATED ENDPOINT ====================
      console.log('📤 Submitting to admin for review (NO AUTH REQUIRED)...');
      console.log('📊 Using POST /api/admin/provider-submissions endpoint');
      
      // ✅ FIXED: Import and use submitProviderProfileWithDocuments (unauthenticated)
      // NOT updateProviderProfileWithDocuments (requires auth - was causing 404 error)
      const { submitProviderProfileWithDocuments } = await import('../../../networks/authcalls/providerProfile');
      
      const response = await submitProviderProfileWithDocuments(personalInfoData, documentsToUpload);
      
      console.log('✅ Submission successful!');
      console.log('📊 Response:', JSON.stringify(response, null, 2));

      // ==================== SAVE SESSION LOCALLY ====================
      const session: PersonalInfoSession = {
        providerType: providerType!,
        providerSubType: providerSubType ?? null,
        formData,
        currentStep: state.personalInfo.currentStep,
        savedAt: new Date().toISOString(),
      };
      await savePersonalInfoSession(session);

      // Save status to storage
      await saveData(KeyForStorage.providerApprovalStatus, 'pending_review');
      if (response.submissionId) {
        await saveData('providerSubmissionId', response.submissionId);
      }

      console.log('✅ === SUBMISSION COMPLETE ===');
      console.log('📊 Submission ID:', response.submissionId);
      console.log('📊 Status:', response.status);
      
      return {
        session,
        submissionId: response.submissionId || null,
        verificationStatus: { 
          isVerified: true,
          status: response.status || 'pending_review',
        },
        message: response.message || 'Profile submitted for admin approval.',
        pendingApproval: true,
        documentsCount: documentsToUpload.length,
      };

    } catch (error: any) {
      console.error('❌ === SUBMISSION FAILED ===');
      console.error('❌ Error:', error.message);
      console.error('❌ Full error:', error);
      return rejectWithValue(error.message || 'Failed to submit information. Please try again.');
    }
  }
);

/**
 * Load Personal Information from Storage
 */
export const loadPersonalInfo = createAsyncThunk(
  'personalInfo/load',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔍 Loading personal info from storage...');

      const session = await loadPersonalInfoSession();
      
      if (session) {
        console.log('✅ Personal info loaded from storage');
        return session;
      }

      console.log('ℹ️ No personal info found in storage');
      return null;

    } catch (error: any) {
      console.error('❌ Failed to load personal info:', error);
      return rejectWithValue('Failed to load saved information');
    }
  }
);

/**
 * Check Provider Approval Status (Unauthenticated)
 */
export const checkApprovalStatus = createAsyncThunk(
  'personalInfo/checkApprovalStatus',
  async (email: string, { rejectWithValue }) => {
    try {
      console.log('🔍 Checking approval status for:', email);

      const { checkProviderApprovalStatus } = await import('../../../networks/authcalls/providerProfile');
      const response = await checkProviderApprovalStatus(email);

      console.log('✅ Approval status:', response.status);
      return response;

    } catch (error: any) {
      console.error('❌ Failed to check approval status:', error);
      return rejectWithValue(error.message || 'Failed to check approval status');
    }
  }
);

// ==================== SLICE ====================

export const personalInfoSlice = createSlice({
  name: 'personalInfo',
  initialState,
  reducers: {
    setProviderInfo: (
      state,
      action: PayloadAction<{ type: ProviderType; subType?: HomeServiceSubType }>
    ) => {
      state.providerType = action.payload.type;
      state.providerSubType = action.payload.subType || null;
      
      // Update formData with provider type
      state.formData.providerType = action.payload.type;
      state.formData.providerSubType = action.payload.subType || undefined;
      
      // Set total steps based on provider type
      state.totalSteps = 3;
    },

    updateFormData: (state, action: PayloadAction<Partial<PersonalInfoData>>) => {
      state.formData = { ...state.formData, ...action.payload };
    },

    setProviderPassword: (state, action: PayloadAction<string>) => {
      state.providerPassword = action.payload;
    },

    clearProviderPassword: (state) => {
      state.providerPassword = undefined;
    },

    setCurrentStep: (state, action: PayloadAction<number>) => {
      if (action.payload >= 1 && action.payload <= state.totalSteps) {
        state.currentStep = action.payload;
      }
    },

    nextStep: (state) => {
      if (state.currentStep < state.totalSteps) {
        state.currentStep += 1;
      }
    },

    previousStep: (state) => {
      if (state.currentStep > 1) {
        state.currentStep -= 1;
      }
    },

    /**
     * Store document locally (NO immediate upload)
     * Documents are stored in Redux state and uploaded when form is submitted
     */
    setDocumentLocal: (
      state,
      action: PayloadAction<{ field: keyof PersonalInfoData; document: DocumentFile }>
    ) => {
      const { field, document } = action.payload;
      (state.formData as any)[field] = document;
      console.log(`📄 Document stored locally: ${field} - ${document.name}`);
    },

    removeDocument: (state, action: PayloadAction<keyof PersonalInfoData>) => {
      (state.formData as any)[action.payload] = undefined;
      console.log(`🗑️ Document removed: ${action.payload}`);
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetPersonalInfo: (state) => {
      state.currentStep = 1;
      state.formData = {
        ...initialState.formData,
        providerType: state.providerType || 'doctor',
        providerSubType: state.providerSubType || undefined,
      };
      state.error = null;
      state.isSubmitted = false;
      state.uploadProgress = {};
      state.pendingApproval = false;
      state.providerPassword = undefined;
      state.isAuthenticated = false;
    },

    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Submit Personal Info
    builder
      .addCase(submitPersonalInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitPersonalInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.isSubmitted = true;
        state.pendingApproval = action.payload.pendingApproval;
        state.verificationStatus = {
          isVerified: action.payload.verificationStatus.isVerified,
          status: action.payload.verificationStatus.status || 'pending_review',
          documents: [],
        };
        state.providerPassword = undefined;
        console.log('✅ Personal info submitted successfully');
      })
      .addCase(submitPersonalInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.error('❌ Personal info submission failed:', action.payload);
      });

    // Load Personal Info
    builder
      .addCase(loadPersonalInfo.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadPersonalInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.formData = action.payload.formData;
          state.providerType = action.payload.providerType;
          state.providerSubType = action.payload.providerSubType;
        }
      })
      .addCase(loadPersonalInfo.rejected, (state) => {
        state.isLoading = false;
      });

    // Check Approval Status
    builder
      .addCase(checkApprovalStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkApprovalStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.verificationStatus = {
            isVerified: true,
            status: action.payload.status,
            documents: [],
          };
          state.pendingApproval = action.payload.status === 'pending_review' || action.payload.status === 'pending_approval';
        }
      })
      .addCase(checkApprovalStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setProviderInfo,
  updateFormData,
  setProviderPassword,
  clearProviderPassword,
  setCurrentStep,
  nextStep,
  previousStep,
  setDocumentLocal,
  removeDocument,
  setError,
  clearError,
  resetPersonalInfo,
  setAuthenticated,
} = personalInfoSlice.actions;

// Selectors
export const selectCurrentStep = (state: RootState) => state.personalInfo.currentStep;
export const selectTotalSteps = (state: RootState) => state.personalInfo.totalSteps;
export const selectProviderType = (state: RootState) => state.personalInfo.providerType;
export const selectProviderSubType = (state: RootState) => state.personalInfo.providerSubType;
export const selectFormData = (state: RootState) => state.personalInfo.formData;
export const selectPersonalInfoLoading = (state: RootState) => state.personalInfo.isLoading;
export const selectPersonalInfoError = (state: RootState) => state.personalInfo.error;
export const selectIsSubmitted = (state: RootState) => state.personalInfo.isSubmitted;
export const selectUploadProgress = (state: RootState) => state.personalInfo.uploadProgress;
export const selectVerificationStatus = (state: RootState) => state.personalInfo.verificationStatus;
export const selectPendingApproval = (state: RootState) => state.personalInfo.pendingApproval;
export const selectProviderPassword = (state: RootState) => state.personalInfo.providerPassword;
export const selectIsAuthenticated = (state: RootState) => state.personalInfo.isAuthenticated;

// Derived selectors
export const selectIsLastStep = (state: RootState) =>
  state.personalInfo.currentStep === state.personalInfo.totalSteps;

export const selectIsFirstStep = (state: RootState) =>
  state.personalInfo.currentStep === 1;

// Export reducer
export default personalInfoSlice.reducer;