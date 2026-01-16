import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../store/createAppSlice';
import { 
  completeProfileStep1, 
  completeProfileStep2, 
  completeProfileStep3,
  getUserProfile,
  UPLOAD_ERROR_CODES,
  UploadPhotoResponse,
} from '../../../networks/authcalls/userProfile';
import { saveUserInfo } from '../../../utils/storage_utils/storageUtils';

type GenderType = 'male' | 'female' | 'other' | null;

interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  profilePhotoId?: string;
  dateOfBirth?: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  profileComplete?: boolean;
  isVerified?: boolean;
}

interface CompleteProfileState {
  // Current step tracking
  currentStep: number;

  // Step 1: Personal Info
  dateOfBirth: string;
  gender: GenderType;

  // Step 2: Location Info
  streetAddress: string;
  city: string;
  postalCode: string;

  // Step 3: Photo Upload
  profilePhoto: string;
  profilePhotoUrl: string;
  profilePhotoId: string;
  photoFileName: string;
  photoFileType: string;
  photoFileSize: number;
  uploadProgress: number;
  uploadError: string;
  uploadErrorCode: string;

  // Common state
  error: string;
  status: 'idle' | 'loading' | 'failed' | 'success';
  user: User | null;
  profileCompletionStep: number;
}

interface CompleteProfilePayload {
  dateOfBirth: string;
  gender: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  profilePhoto?: string;
}

interface CompleteProfileResponse {
  success: boolean;
  user: User;
  message: string;
  profilePhotoUrl?: string;
  profilePhotoId?: string;
}

// Type for step 3 result (can be either full response or simple success)
interface Step3Result {
  success: boolean;
  message: string;
  profilePhotoUrl?: string;
  profilePhotoId?: string;
  profilePhoto?: string;
  user?: User;
}

// Allowed file types (matching backend)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const initialState: CompleteProfileState = {
  currentStep: 1,
  
  // Step 1
  dateOfBirth: '',
  gender: null,

  // Step 2
  streetAddress: '',
  city: '',
  postalCode: '',

  // Step 3
  profilePhoto: '',
  profilePhotoUrl: '',
  profilePhotoId: '',
  photoFileName: '',
  photoFileType: '',
  photoFileSize: 0,
  uploadProgress: 0,
  uploadError: '',
  uploadErrorCode: '',

  // Common
  error: '',
  status: 'idle',
  user: null,
  profileCompletionStep: 0,
};

export const completeProfileSlice = createAppSlice({
  name: 'completeProfile',
  initialState,
  reducers: (create) => ({
    // Step navigation
    setCurrentStep: create.reducer((state, action: PayloadAction<number>) => {
      if (action.payload >= 1 && action.payload <= 3) {
        state.currentStep = action.payload;
        state.error = '';
      }
    }),
    nextStep: create.reducer((state) => {
      if (state.currentStep < 3) {
        state.currentStep += 1;
        state.error = '';
      }
    }),
    previousStep: create.reducer((state) => {
      if (state.currentStep > 1) {
        state.currentStep -= 1;
        state.error = '';
      }
    }),

    // Step 1: Personal Info
    setDateOfBirth: create.reducer((state, action: PayloadAction<string>) => {
      state.dateOfBirth = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    setGender: create.reducer((state, action: PayloadAction<GenderType>) => {
      state.gender = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),

    // Step 2: Location Info
    setStreetAddress: create.reducer((state, action: PayloadAction<string>) => {
      state.streetAddress = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    setCity: create.reducer((state, action: PayloadAction<string>) => {
      state.city = action.payload;
      if (state.error) {
        state.error = '';
      }
    }),
    setPostalCode: create.reducer((state, action: PayloadAction<string>) => {
      const cleanedValue = action.payload.replace(/\D/g, '').slice(0, 5);
      state.postalCode = cleanedValue;
      if (state.error) {
        state.error = '';
      }
    }),

    // Step 3: Photo Upload
    setProfilePhoto: create.reducer((state, action: PayloadAction<string>) => {
      state.profilePhoto = action.payload;
      state.uploadError = '';
      state.uploadErrorCode = '';
      if (state.error) {
        state.error = '';
      }
    }),
    setPhotoMetadata: create.reducer(
      (
        state,
        action: PayloadAction<{
          fileName?: string;
          fileType?: string;
          fileSize?: number;
        }>
      ) => {
        if (action.payload.fileName) {
          state.photoFileName = action.payload.fileName;
        }
        if (action.payload.fileType) {
          state.photoFileType = action.payload.fileType;
        }
        if (action.payload.fileSize !== undefined) {
          state.photoFileSize = action.payload.fileSize;
        }
        // Clear upload errors when new metadata is set
        state.uploadError = '';
        state.uploadErrorCode = '';
      }
    ),
    setUploadProgress: create.reducer((state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    }),
    setUploadError: create.reducer((state, action: PayloadAction<{ message: string; code?: string }>) => {
      state.uploadError = action.payload.message;
      state.uploadErrorCode = action.payload.code || '';
    }),
    clearProfilePhoto: create.reducer((state) => {
      state.profilePhoto = '';
      state.profilePhotoUrl = '';
      state.profilePhotoId = '';
      state.photoFileName = '';
      state.photoFileType = '';
      state.photoFileSize = 0;
      state.uploadProgress = 0;
      state.uploadError = '';
      state.uploadErrorCode = '';
    }),

    // Validation
    validateCurrentStep: create.reducer((state) => {
      state.status = 'loading';

      if (state.currentStep === 1) {
        // Validate Step 1: Personal Info
        if (!state.dateOfBirth) {
          state.error = 'Please select your date of birth';
          state.status = 'failed';
          return;
        }

        const birthDate = new Date(state.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (age < 13) {
          state.error = 'You must be at least 13 years old';
          state.status = 'failed';
          return;
        }

        if (age > 120) {
          state.error = 'Please enter a valid date of birth';
          state.status = 'failed';
          return;
        }

        if (!state.gender) {
          state.error = 'Please select your gender';
          state.status = 'failed';
          return;
        }
      } else if (state.currentStep === 2) {
        // Validate Step 2: Location Info
        if (!state.streetAddress.trim()) {
          state.error = 'Please enter your street address';
          state.status = 'failed';
          return;
        }

        if (state.streetAddress.trim().length < 5) {
          state.error = 'Please enter a valid street address';
          state.status = 'failed';
          return;
        }

        if (!state.city.trim()) {
          state.error = 'Please enter your city';
          state.status = 'failed';
          return;
        }

        if (state.city.trim().length < 2) {
          state.error = 'Please enter a valid city name';
          state.status = 'failed';
          return;
        }

        if (!state.postalCode.trim()) {
          state.error = 'Please enter your postal code';
          state.status = 'failed';
          return;
        }

        const postalRegex = /^[0-9]{5}$/;
        if (!postalRegex.test(state.postalCode.trim())) {
          state.error = 'Please enter a valid 5-digit postal code';
          state.status = 'failed';
          return;
        }
      } else if (state.currentStep === 3) {
        // Validate Step 3: Photo Upload (optional)
        if (state.profilePhoto) {
          if (state.photoFileSize > MAX_FILE_SIZE) {
            state.error = 'Photo size must be less than 5MB';
            state.status = 'failed';
            return;
          }

          if (state.photoFileType && !ALLOWED_MIME_TYPES.includes(state.photoFileType)) {
            state.error = 'Only JPEG, PNG, GIF, and WebP images are allowed';
            state.status = 'failed';
            return;
          }
        }
      }

      // All validations passed
      state.error = '';
      state.status = 'idle';
    }),

    // Error handling
    clearError: create.reducer((state) => {
      state.error = '';
    }),
    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }),

    // Reset
    resetProfile: create.reducer((state) => {
      return initialState;
    }),

    // Submit individual steps
    submitStep1Async: create.asyncThunk(
      async (
        _,
        { getState, rejectWithValue }
      ) => {
        console.log('📤 submitStep1Async started');

        try {
          const state = getState() as any;
          const { dateOfBirth, gender } = state.completeProfile;

          if (!dateOfBirth || !gender) {
            throw new Error('Please fill all required fields');
          }

          const result = await completeProfileStep1({
            dateOfBirth,
            gender,
          });

          console.log('📥 Step 1 completed:', JSON.stringify(result, null, 2));

          return result;
        } catch (error: any) {
          console.log('❌ submitStep1Async caught error:', error.message);
          return rejectWithValue(error.message || 'Failed to complete step 1');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Step 1 pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Step 1 fulfilled:', JSON.stringify(action.payload, null, 2));
          state.status = 'idle';
          state.profileCompletionStep = action.payload.profileCompletionStep;
          state.error = '';
          console.log('Step 1 completed successfully');
        },
        rejected: (state, action) => {
          console.log('❌ Step 1 rejected:', action.payload || action.error.message);
          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Failed to complete step 1';
        },
      }
    ),

    submitStep2Async: create.asyncThunk(
      async (
        _,
        { getState, rejectWithValue }
      ) => {
        console.log('📤 submitStep2Async started');

        try {
          const state = getState() as any;
          const { streetAddress, city, postalCode } = state.completeProfile;

          if (!streetAddress || !city || !postalCode) {
            throw new Error('Please fill all required fields');
          }

          const result = await completeProfileStep2({
            street: streetAddress,
            city,
            postalCode,
          });

          console.log('📥 Step 2 completed:', JSON.stringify(result, null, 2));

          return result;
        } catch (error: any) {
          console.log('❌ submitStep2Async caught error:', error.message);
          return rejectWithValue(error.message || 'Failed to complete step 2');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Step 2 pending...');
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Step 2 fulfilled:', JSON.stringify(action.payload, null, 2));
          state.status = 'idle';
          state.profileCompletionStep = action.payload.profileCompletionStep;
          state.error = '';
          console.log('Step 2 completed successfully');
        },
        rejected: (state, action) => {
          console.log('❌ Step 2 rejected:', action.payload || action.error.message);
          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Failed to complete step 2';
        },
      }
    ),

    submitStep3Async: create.asyncThunk<Step3Result, void>(
      async (
        _,
        { getState, rejectWithValue, dispatch }
      ) => {
        console.log('📤 submitStep3Async started');

        try {
          const state = getState() as any;
          const { profilePhoto, photoFileName, photoFileType, photoFileSize } = state.completeProfile;

          // Photo is optional
          if (!profilePhoto) {
            console.log('No photo to upload, skipping step 3');
            return { success: true, message: 'Profile completed without photo' };
          }

          console.log('Photo details:', {
            uri: profilePhoto,
            fileName: photoFileName,
            fileType: photoFileType,
            fileSize: photoFileSize,
          });

          dispatch(completeProfileSlice.actions.setUploadProgress(30));

          const result = await completeProfileStep3(
            profilePhoto,
            photoFileName || 'profile-photo.jpg',
            photoFileType || 'image/jpeg',
            photoFileSize || 0
          );

          dispatch(completeProfileSlice.actions.setUploadProgress(100));

          console.log('📥 Step 3 completed:', JSON.stringify(result, null, 2));

          return {
            success: result.success,
            message: result.message,
            profilePhotoUrl: result.profilePhotoUrl,
            profilePhotoId: result.profilePhotoId,
            profilePhoto: result.profilePhoto,
            user: result.user,
          };
        } catch (error: any) {
          console.log('❌ submitStep3Async caught error:', error.message);
          console.log('Error code:', error.code);
          dispatch(completeProfileSlice.actions.setUploadProgress(0));
          dispatch(completeProfileSlice.actions.setUploadError({ 
            message: error.message, 
            code: error.code 
          }));
          return rejectWithValue(error.message || 'Failed to upload photo');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Step 3 pending...');
          state.status = 'loading';
          state.error = '';
          state.uploadProgress = 10;
          state.uploadError = '';
          state.uploadErrorCode = '';
        },
        fulfilled: (state, action) => {
          console.log('✅ Step 3 fulfilled:', JSON.stringify(action.payload, null, 2));
          state.status = 'idle';
          state.error = '';
          state.uploadProgress = 100;
          
          // Store the new photo URLs from response (with type guard)
          if (action.payload.profilePhotoUrl) {
            state.profilePhotoUrl = action.payload.profilePhotoUrl;
          }
          if (action.payload.profilePhotoId) {
            state.profilePhotoId = action.payload.profilePhotoId;
          }
          
          console.log('Step 3 completed successfully');
        },
        rejected: (state, action) => {
          console.log('❌ Step 3 rejected:', action.payload || action.error.message);
          state.status = 'failed';
          state.error = (action.payload as string) || action.error.message || 'Failed to upload photo';
          state.uploadProgress = 0;
        },
      }
    ),

    // Submit complete profile (all steps)
    submitCompleteProfileAsync: create.asyncThunk(
      async (
        payload: CompleteProfilePayload,
        { rejectWithValue, dispatch, getState }
      ) => {
        console.log('📤 submitCompleteProfileAsync started');
        console.log('Payload received:', JSON.stringify(payload, null, 2));

        try {
          dispatch(completeProfileSlice.actions.setUploadProgress(10));

          // Step 1: Personal Info
          console.log('Completing Step 1: Personal Info');
          const step1Result = await completeProfileStep1({
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender,
          });

          dispatch(completeProfileSlice.actions.setUploadProgress(40));
          console.log('✅ Step 1 completed:', step1Result);

          // Step 2: Address
          console.log('Completing Step 2: Address');
          const step2Result = await completeProfileStep2({
            street: payload.streetAddress,
            city: payload.city,
            postalCode: payload.postalCode,
          });

          dispatch(completeProfileSlice.actions.setUploadProgress(70));
          console.log('✅ Step 2 completed:', step2Result);

          // Step 3: Photo (optional)
          let photoResult: Step3Result | null = null;
          if (payload.profilePhoto) {
            console.log('Completing Step 3: Photo Upload');
            
            // Get the photo metadata from state
            const state = getState() as any;
            const { photoFileName, photoFileType, photoFileSize } = state.completeProfile;
            
            console.log('Photo metadata:', {
              uri: payload.profilePhoto,
              fileName: photoFileName || 'profile-photo.jpg',
              fileType: photoFileType || 'image/jpeg',
              fileSize: photoFileSize || 0,
            });
            
            try {
              const uploadResult = await completeProfileStep3(
                payload.profilePhoto,
                photoFileName || 'profile-photo.jpg',
                photoFileType || 'image/jpeg',
                photoFileSize || 0
              );
              
              photoResult = {
                success: uploadResult.success,
                message: uploadResult.message,
                profilePhotoUrl: uploadResult.profilePhotoUrl,
                profilePhotoId: uploadResult.profilePhotoId,
                profilePhoto: uploadResult.profilePhoto,
                user: uploadResult.user,
              };
              
              console.log('✅ Step 3 (photo) completed:', photoResult);
            } catch (photoError: any) {
              console.log('⚠️ Photo upload failed but continuing:', photoError.message);
              console.log('⚠️ Error code:', photoError.code);
              // Don't fail the entire process if photo upload fails
              // The user can upload a photo later
              dispatch(completeProfileSlice.actions.setUploadError({
                message: photoError.message,
                code: photoError.code,
              }));
            }
          } else {
            console.log('⏭️ Step 3 skipped - no photo selected');
          }

          dispatch(completeProfileSlice.actions.setUploadProgress(90));

          // Get updated user profile
          console.log('Fetching updated user profile...');
          const updatedUser = await getUserProfile();

          dispatch(completeProfileSlice.actions.setUploadProgress(100));

          console.log('📥 Complete profile process finished');
          console.log('Updated user:', JSON.stringify(updatedUser, null, 2));

          const result: CompleteProfileResponse = {
            success: true,
            message: 'Profile completed successfully',
            user: updatedUser,
            profilePhotoUrl: photoResult?.profilePhotoUrl,
            profilePhotoId: photoResult?.profilePhotoId,
          };

          return result;
        } catch (error: any) {
          console.log('❌ submitCompleteProfileAsync caught error:', error);
          console.log('Error message:', error.message);
          console.log('Error response:', error.response?.data);
          dispatch(completeProfileSlice.actions.setUploadProgress(0));
          return rejectWithValue(error.message || 'Profile completion failed');
        }
      },
      {
        pending: (state) => {
          console.log('⏳ Complete profile pending...');
          state.status = 'loading';
          state.error = '';
          state.uploadProgress = 5;
        },
        fulfilled: (state, action) => {
          console.log(
            '✅ Complete profile fulfilled with payload:',
            JSON.stringify(action.payload, null, 2)
          );

          state.status = 'success';
          state.user = action.payload.user;
          state.error = '';
          state.uploadProgress = 100;
          
          // Store photo URLs from response
          if (action.payload.profilePhotoUrl) {
            state.profilePhotoUrl = action.payload.profilePhotoUrl;
          }
          if (action.payload.profilePhotoId) {
            state.profilePhotoId = action.payload.profilePhotoId;
          }

          if (action.payload.user) {
            saveUserInfo(action.payload.user);
          }

          console.log('💾 Updated user profile saved to storage');
          console.log('👤 Profile completed for:', state.user?.email);
        },
        rejected: (state, action) => {
          console.log(
            '❌ Complete profile rejected:',
            action.payload || action.error.message
          );

          state.status = 'failed';
          state.error =
            (action.payload as string) ||
            action.error.message ||
            'Profile completion failed';
          state.uploadProgress = 0;

          console.log('Error set in state:', state.error);
        },
      }
    ),

    // Fetch updated user profile
    fetchUserProfileAsync: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          console.log('📤 Fetching user profile');
          const user = await getUserProfile();
          return user;
        } catch (error: any) {
          console.log('❌ Fetch profile error:', error.message);
          return rejectWithValue(error.message || 'Failed to fetch profile');
        }
      },
      {
        pending: (state) => {
          state.status = 'loading';
        },
        fulfilled: (state, action) => {
          state.status = 'idle';
          state.user = action.payload;
          
          // Update photo URLs from user object
          if (action.payload.profilePhoto) {
            state.profilePhotoUrl = action.payload.profilePhoto;
          }
          if (action.payload.profilePhotoUrl) {
            state.profilePhotoUrl = action.payload.profilePhotoUrl;
          }
          if (action.payload.profilePhotoId) {
            state.profilePhotoId = action.payload.profilePhotoId;
          }
          
          saveUserInfo(action.payload);
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = (action.payload as string) || 'Failed to fetch profile';
        },
      }
    ),
  }),

  selectors: {
    // Navigation
    selectCurrentStep: (completeProfile) => completeProfile.currentStep,
    selectProfileCompletionStep: (completeProfile) => completeProfile.profileCompletionStep,

    // Step 1: Personal Info
    selectDateOfBirth: (completeProfile) => completeProfile.dateOfBirth,
    selectGender: (completeProfile) => completeProfile.gender,
    selectFormattedDateOfBirth: (completeProfile) => {
      if (!completeProfile.dateOfBirth) return '';
      const date = new Date(completeProfile.dateOfBirth);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    },
    selectAge: (completeProfile) => {
      if (!completeProfile.dateOfBirth) return null;
      const birthDate = new Date(completeProfile.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1;
      }
      return age;
    },

    // Step 2: Location Info
    selectStreetAddress: (completeProfile) => completeProfile.streetAddress,
    selectCity: (completeProfile) => completeProfile.city,
    selectPostalCode: (completeProfile) => completeProfile.postalCode,
    selectFullAddress: (completeProfile) => {
      if (
        !completeProfile.streetAddress.trim() ||
        !completeProfile.city.trim() ||
        !completeProfile.postalCode.trim()
      ) {
        return '';
      }
      return `${completeProfile.streetAddress.trim()}, ${completeProfile.city.trim()}, ${completeProfile.postalCode.trim()}`;
    },

    // Step 3: Photo Upload
    selectProfilePhoto: (completeProfile) => completeProfile.profilePhoto,
    selectProfilePhotoUrl: (completeProfile) => completeProfile.profilePhotoUrl,
    selectProfilePhotoId: (completeProfile) => completeProfile.profilePhotoId,
    selectPhotoFileName: (completeProfile) => completeProfile.photoFileName,
    selectPhotoFileType: (completeProfile) => completeProfile.photoFileType,
    selectPhotoFileSize: (completeProfile) => completeProfile.photoFileSize,
    selectUploadProgress: (completeProfile) => completeProfile.uploadProgress,
    selectUploadError: (completeProfile) => completeProfile.uploadError,
    selectUploadErrorCode: (completeProfile) => completeProfile.uploadErrorCode,
    selectPhotoSizeInMB: (completeProfile) => {
      if (completeProfile.photoFileSize === 0) return 0;
      return (completeProfile.photoFileSize / (1024 * 1024)).toFixed(2);
    },
    selectHasPhoto: (completeProfile) => !!completeProfile.profilePhoto,

    // Common
    selectError: (completeProfile) => completeProfile.error,
    selectStatus: (completeProfile) => completeProfile.status,
    selectUser: (completeProfile) => completeProfile.user,
    selectIsLoading: (completeProfile) => completeProfile.status === 'loading',
    selectIsSuccess: (completeProfile) => completeProfile.status === 'success',
    selectIsProfileComplete: (completeProfile) => completeProfile.user?.profileComplete || false,

    // Validation
    selectIsStep1Complete: (completeProfile) => 
      !!completeProfile.dateOfBirth && !!completeProfile.gender,
    selectIsStep2Complete: (completeProfile) =>
      completeProfile.streetAddress.trim().length > 0 &&
      completeProfile.city.trim().length > 0 &&
      completeProfile.postalCode.trim().length === 5,
    selectIsStep3Complete: (completeProfile) => {
      // Photo is optional, so step 3 is always complete if no photo
      if (!completeProfile.profilePhoto) return true;

      const isSizeValid = completeProfile.photoFileSize <= MAX_FILE_SIZE;
      const isTypeValid =
        !completeProfile.photoFileType || ALLOWED_MIME_TYPES.includes(completeProfile.photoFileType);

      return isSizeValid && isTypeValid;
    },
    selectIsStepComplete: (completeProfile) => {
      if (completeProfile.currentStep === 1) {
        return !!completeProfile.dateOfBirth && !!completeProfile.gender;
      } else if (completeProfile.currentStep === 2) {
        return (
          completeProfile.streetAddress.trim().length > 0 &&
          completeProfile.city.trim().length > 0 &&
          completeProfile.postalCode.trim().length === 5
        );
      } else if (completeProfile.currentStep === 3) {
        if (!completeProfile.profilePhoto) return true;

        const isSizeValid = completeProfile.photoFileSize <= MAX_FILE_SIZE;
        const isTypeValid =
          !completeProfile.photoFileType || ALLOWED_MIME_TYPES.includes(completeProfile.photoFileType);

        return isSizeValid && isTypeValid;
      }
      return false;
    },

    // All profile data
    selectAllProfileData: (completeProfile) => ({
      dateOfBirth: completeProfile.dateOfBirth,
      gender: completeProfile.gender || '',
      streetAddress: completeProfile.streetAddress,
      city: completeProfile.city,
      postalCode: completeProfile.postalCode,
      profilePhoto: completeProfile.profilePhoto || undefined,
    }),
  },
});

export const {
  setCurrentStep,
  nextStep,
  previousStep,
  setDateOfBirth,
  setGender,
  setStreetAddress,
  setCity,
  setPostalCode,
  setProfilePhoto,
  setPhotoMetadata,
  setUploadProgress,
  setUploadError,
  clearProfilePhoto,
  validateCurrentStep,
  clearError,
  setError,
  resetProfile,
  submitStep1Async,
  submitStep2Async,
  submitStep3Async,
  submitCompleteProfileAsync,
  fetchUserProfileAsync,
} = completeProfileSlice.actions;

export const {
  selectCurrentStep,
  selectProfileCompletionStep,
  selectDateOfBirth,
  selectGender,
  selectFormattedDateOfBirth,
  selectAge,
  selectStreetAddress,
  selectCity,
  selectPostalCode,
  selectFullAddress,
  selectProfilePhoto,
  selectProfilePhotoUrl,
  selectProfilePhotoId,
  selectPhotoFileName,
  selectPhotoFileType,
  selectPhotoFileSize,
  selectUploadProgress,
  selectUploadError,
  selectUploadErrorCode,
  selectPhotoSizeInMB,
  selectHasPhoto,
  selectError,
  selectStatus,
  selectUser,
  selectIsLoading,
  selectIsSuccess,
  selectIsProfileComplete,
  selectIsStep1Complete,
  selectIsStep2Complete,
  selectIsStep3Complete,
  selectIsStepComplete,
  selectAllProfileData,
} = completeProfileSlice.selectors;