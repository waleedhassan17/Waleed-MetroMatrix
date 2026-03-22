import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchDoctorProviderProfileApi, updateDoctorProviderProfileApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export interface DoctorProfileData {
  doctorId: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experience: number;
  pmcNumber: string;
  bio: string;
  clinicName: string;
  clinicAddress: string;
  consultationFee: number;
  videoConsultationFee: number;
  currency: string;
  languages: string[];
  rating: number;
  totalReviews: number;
  totalPatients: number;
  isVerified: boolean;
  isAvailable: boolean;
}

export interface DoctorProfileState {
  profile: DoctorProfileData | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: DoctorProfileState = {
  profile: null,
  loading: false,
  saving: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchDoctorProfile = createAsyncThunk<
  DoctorProfileData,
  void,
  { rejectValue: string }
>('doctorProfile/fetchDoctorProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorProviderProfileApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data as unknown as DoctorProfileData;
  } catch {
    return rejectWithValue('Failed to load profile');
  }
});

export const updateDoctorProfile = createAsyncThunk<
  DoctorProfileData,
  Partial<DoctorProfileData>,
  { rejectValue: string }
>('doctorProfile/updateDoctorProfile', async (updates, { rejectWithValue }) => {
  try {
    const res = await updateDoctorProviderProfileApi(updates);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data as unknown as DoctorProfileData;
  } catch {
    return rejectWithValue('Failed to update profile');
  }
});

// ── Slice ───────────────────────────────────

const doctorProfileSlice = createSlice({
  name: 'doctorProfile',
  initialState,
  reducers: {
    toggleAvailability(state) {
      if (state.profile) {
        state.profile.isAvailable = !state.profile.isAvailable;
      }
    },
    resetDoctorProfile() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctorProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchDoctorProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      .addCase(updateDoctorProfile.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateDoctorProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.profile = action.payload;
      })
      .addCase(updateDoctorProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const { toggleAvailability, resetDoctorProfile } = doctorProfileSlice.actions;

export default doctorProfileSlice.reducer;
