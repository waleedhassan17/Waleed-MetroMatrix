import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
  /** When the profile was last loaded, for refetch-only-when-stale. */
  lastFetchedAt: number | null;
}

const initialState: DoctorProfileState = {
  profile: null,
  loading: false,
  saving: false,
  error: null,
  lastFetchedAt: null,
};

// ── Async Thunks ────────────────────────────

export const fetchDoctorProfile = createAsyncThunk<
  DoctorProfileData,
  void,
  { rejectValue: string }
>('doctorProfile/fetchDoctorProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorProviderProfileApi();
    if (!res.success) return rejectWithValue(res.message ?? "We couldn't load your profile");
    return res.data as unknown as DoctorProfileData;
  } catch {
    return rejectWithValue("We couldn't load your profile");
  }
});

export const updateDoctorProfile = createAsyncThunk<
  DoctorProfileData,
  Partial<DoctorProfileData>,
  { rejectValue: string }
>('doctorProfile/updateDoctorProfile', async (updates, { rejectWithValue }) => {
  try {
    const res = await updateDoctorProviderProfileApi(updates);
    if (!res.success) return rejectWithValue(res.message ?? "We couldn't save your profile");
    return res.data as unknown as DoctorProfileData;
  } catch {
    return rejectWithValue("We couldn't save your profile");
  }
});

// ── Slice ───────────────────────────────────
//
// There was a `toggleAvailability` reducer here that flipped a switch in
// memory and called no API. The profile refetched on focus, so the switch
// flipped back and the doctor's choice silently did nothing. Taking bookings
// is now decided by weekly hours and time off in the Availability hub.

const doctorProfileSlice = createSlice({
  name: 'doctorProfile',
  initialState,
  reducers: {
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
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchDoctorProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "We couldn't load your profile";
      })
      .addCase(updateDoctorProfile.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateDoctorProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.profile = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(updateDoctorProfile.rejected, (state) => {
        // Reported by the screen that saved; the profile on screen stays valid.
        state.saving = false;
      });
  },
});

export const { resetDoctorProfile } = doctorProfileSlice.actions;

export default doctorProfileSlice.reducer;
