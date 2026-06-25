import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Doctor } from '../../../../models/healthcare/types';
import { fetchDoctorsApi } from '../../../../networks/healthcare/doctorApi';
import {
  fetchAllDoctorsAdminApi,
  approveDoctorApi,
  rejectDoctorApi,
} from '../../../../networks/healthcare/adminApi';

// ── Types ─────────────────────────────────────

export type VerificationFilter = 'all' | 'pending' | 'verified' | 'rejected';

export interface DoctorManagementState {
  doctors: Doctor[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  searchQuery: string;
  verificationFilter: VerificationFilter;
  selectedDoctorId: string | null;
  actionLoading: boolean;
}

const initialState: DoctorManagementState = {
  doctors: [],
  loading: false,
  refreshing: false,
  error: null,
  searchQuery: '',
  verificationFilter: 'all',
  selectedDoctorId: null,
  actionLoading: false,
};

// ── Async Thunks ──────────────────────────────

export const fetchAllDoctors = createAsyncThunk(
  'doctorManagement/fetchAllDoctors',
  async (_, { rejectWithValue }) => {
    try {
      // Admin endpoint returns doctors across all verification statuses.
      const res = await fetchAllDoctorsAdminApi({ limit: 100 });
      if (res.success) {
        return res.data.doctors;
      }
      // Fallback to the public list if the admin call is unavailable.
      const pub = await fetchDoctorsApi({ limit: 100 });
      if (pub.success) return pub.data.doctors;
      return rejectWithValue('Failed to fetch doctors');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const verifyDoctor = createAsyncThunk(
  'doctorManagement/verifyDoctor',
  async (
    { doctorId, action, reason }: { doctorId: string; action: 'verify' | 'reject'; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const res =
        action === 'verify'
          ? await approveDoctorApi(doctorId)
          : await rejectDoctorApi(doctorId, reason || 'Did not meet verification requirements');
      if (!res.success) {
        return rejectWithValue(res.message || 'Action failed');
      }
      return { doctorId, newStatus: action === 'verify' ? 'verified' as const : 'rejected' as const };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Action failed');
    }
  }
);

export const toggleDoctorAvailability = createAsyncThunk(
  'doctorManagement/toggleAvailability',
  async (doctorId: string, { getState, rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const state = getState() as { doctorManagement: DoctorManagementState };
      const doctor = state.doctorManagement.doctors.find((d) => d.doctorId === doctorId);
      return { doctorId, isAvailable: !doctor?.isAvailable };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Toggle failed');
    }
  }
);

// ── Slice ─────────────────────────────────────

const doctorManagementSlice = createSlice({
  name: 'doctorManagement',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setVerificationFilter(state, action: PayloadAction<VerificationFilter>) {
      state.verificationFilter = action.payload;
    },
    setSelectedDoctor(state, action: PayloadAction<string | null>) {
      state.selectedDoctorId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.doctors = action.payload;
      })
      .addCase(fetchAllDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch';
      });

    builder
      .addCase(verifyDoctor.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(verifyDoctor.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.doctors.findIndex((d) => d.doctorId === action.payload.doctorId);
        if (idx !== -1) {
          state.doctors[idx].verificationStatus = action.payload.newStatus;
          state.doctors[idx].isVerified = action.payload.newStatus === 'verified';
        }
      })
      .addCase(verifyDoctor.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Action failed';
      });

    builder
      .addCase(toggleDoctorAvailability.fulfilled, (state, action) => {
        const idx = state.doctors.findIndex((d) => d.doctorId === action.payload.doctorId);
        if (idx !== -1) {
          state.doctors[idx].isAvailable = action.payload.isAvailable;
        }
      });
  },
});

// ── Selectors ─────────────────────────────────

export const selectFilteredDoctors = (state: { doctorManagement: DoctorManagementState }) => {
  const { doctors, searchQuery, verificationFilter } = state.doctorManagement;
  let filtered = [...doctors];

  if (verificationFilter !== 'all') {
    filtered = filtered.filter((d) => d.verificationStatus === verificationFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.bio.toLowerCase().includes(q) ||
        d.qualifications.some((qual) => qual.toLowerCase().includes(q)) ||
        d.pmcNumber.toLowerCase().includes(q)
    );
  }

  return filtered;
};

export const selectDoctorManagementLoading = (state: { doctorManagement: DoctorManagementState }) =>
  state.doctorManagement.loading;

export const selectVerificationFilter = (state: { doctorManagement: DoctorManagementState }) =>
  state.doctorManagement.verificationFilter;

export const selectDoctorSearchQuery = (state: { doctorManagement: DoctorManagementState }) =>
  state.doctorManagement.searchQuery;

export const selectActionLoading = (state: { doctorManagement: DoctorManagementState }) =>
  state.doctorManagement.actionLoading;

export const selectDoctorStats = (state: { doctorManagement: DoctorManagementState }) => {
  const { doctors } = state.doctorManagement;
  return {
    total: doctors.length,
    verified: doctors.filter((d) => d.verificationStatus === 'verified').length,
    pending: doctors.filter((d) => d.verificationStatus === 'pending').length,
    rejected: doctors.filter((d) => d.verificationStatus === 'rejected').length,
  };
};

// ── Exports ───────────────────────────────────

export const { setSearchQuery, setVerificationFilter, setSelectedDoctor, clearError } =
  doctorManagementSlice.actions;

export default doctorManagementSlice.reducer;
