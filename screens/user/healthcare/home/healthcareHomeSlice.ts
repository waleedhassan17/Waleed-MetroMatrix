import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Doctor, Specialty, Appointment } from '../../../../models/healthcare/types';
import { fetchSpecialtiesApi, fetchDoctorsApi, fetchNextAppointmentApi } from '../../../../networks/healthcare/doctorApi';
import {
  fetchAppointmentsApi,
  fetchMedicalRecordsApi,
  fetchMyPrescriptionsApi,
} from '../../../../networks/healthcare/appointmentApi';

// ── State Interface ─────────────────────────

/**
 * What this patient actually has on this service.
 *
 * Replaces a hardcoded "50,000+ Patients / 200+ Doctors / 4.8 Rating" bar —
 * three figures nobody had measured, presented as fact. These are the
 * patient's own, and every one of them is a real count from the API.
 */
export interface HealthcareHomeStats {
  upcoming: number;
  records: number;
  prescriptions: number;
}

export interface HealthcareHomeState {
  featuredDoctors: Doctor[];
  specialties: Specialty[];
  nextAppointment: Appointment | null;
  stats: HealthcareHomeStats;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  // UI State
  searchQuery: string;
  selectedSpecialtyId: string | null;
  // Cache management
  cacheExpiry: number; // Cache duration in ms (5 minutes default)
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const EMPTY_STATS: HealthcareHomeStats = { upcoming: 0, records: 0, prescriptions: 0 };

const initialState: HealthcareHomeState = {
  featuredDoctors: [],
  specialties: [],
  nextAppointment: null,
  stats: EMPTY_STATS,
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
  searchQuery: '',
  selectedSpecialtyId: null,
  cacheExpiry: CACHE_DURATION,
};

// ── Async Thunks ────────────────────────────

/**
 * The patient's own three counts, for the "Your health" strip.
 *
 * Every one is best-effort and falls back to 0: these drive a summary band,
 * and the home screen must not fail to load because a count did not come back.
 *
 * All three are counted from the returned rows rather than from a pagination
 * total. The backend sends `pagination` as a SIBLING of `data`, and the
 * healthcare envelope unwrapper returns only `data` — so the normalized
 * pagination on these responses is always zeroed and cannot be counted on.
 * A patient's pending + confirmed appointments ('confirmed' maps to the
 * backend's `upcoming` bucket, which covers both) fit well inside one page.
 */
const STATS_PAGE = 100;

async function fetchPatientStats(): Promise<HealthcareHomeStats> {
  const [appointmentsRes, recordsRes, prescriptionsRes] = await Promise.all([
    fetchAppointmentsApi({ status: 'confirmed', limit: STATS_PAGE }).catch(() => null),
    fetchMedicalRecordsApi('').catch(() => null),
    fetchMyPrescriptionsApi().catch(() => null),
  ]);

  return {
    upcoming: appointmentsRes?.success ? appointmentsRes.data.appointments.length : 0,
    records: recordsRes?.success ? recordsRes.data.length : 0,
    prescriptions: prescriptionsRes?.success ? prescriptionsRes.data.length : 0,
  };
}

export const fetchHomeData = createAsyncThunk(
  'healthcareHome/fetchHomeData',
  async (forceRefresh: boolean | void, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { healthcareHome: HealthcareHomeState };
      const { lastUpdated, cacheExpiry, specialties, featuredDoctors } = state.healthcareHome;

      // Check cache validity (skip fetch if data is fresh and not forcing refresh)
      const now = Date.now();
      const isCacheValid = lastUpdated && (now - lastUpdated) < cacheExpiry;
      
      if (isCacheValid && !forceRefresh && specialties.length > 0 && featuredDoctors.length > 0) {
        return {
          specialties,
          featuredDoctors,
          stats: state.healthcareHome.stats,
          fromCache: true,
        };
      }

      const [specialtiesRes, doctorsRes, appointmentRes, stats] = await Promise.all([
        fetchSpecialtiesApi(),
        fetchDoctorsApi({ sort: 'rating', limit: 6 }),
        fetchNextAppointmentApi().catch(() => ({ success: false, data: null })),
        fetchPatientStats(),
      ]);

      if (!specialtiesRes.success && !doctorsRes.success) {
        return rejectWithValue('Failed to fetch data. Please try again.');
      }

      return {
        specialties: specialtiesRes.success ? specialtiesRes.data : [],
        featuredDoctors: doctorsRes.success ? doctorsRes.data.doctors : [],
        nextAppointment: appointmentRes.success ? appointmentRes.data : null,
        stats,
        fromCache: false,
      };
    } catch (error: any) {
      // Handle network errors gracefully
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please check your network.');
      }
      return rejectWithValue(error.message || 'Something went wrong. Please try again.');
    }
  }
);

export const refreshHomeData = createAsyncThunk(
  'healthcareHome/refreshHomeData',
  async (_, { dispatch }) => {
    return dispatch(fetchHomeData(true)).unwrap();
  }
);

export const searchDoctors = createAsyncThunk(
  'healthcareHome/searchDoctors',
  async (query: string, { rejectWithValue }) => {
    try {
      if (!query.trim()) {
        return { doctors: [], query: '' };
      }

      const response = await fetchDoctorsApi({ 
        search: query.trim(),
        limit: 10 
      });

      return {
        doctors: response.success ? response.data.doctors : [],
        query: query.trim(),
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Search failed');
    }
  }
);

// ── Slice ───────────────────────────────────

const healthcareHomeSlice = createSlice({
  name: 'healthcareHome',
  initialState,
  reducers: {
    setFeaturedDoctors(state, action: PayloadAction<Doctor[]>) {
      state.featuredDoctors = action.payload;
    },
    setSpecialties(state, action: PayloadAction<Specialty[]>) {
      state.specialties = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setRefreshing(state, action: PayloadAction<boolean>) {
      state.refreshing = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSelectedSpecialty(state, action: PayloadAction<string | null>) {
      state.selectedSpecialtyId = action.payload;
    },
    invalidateCache(state) {
      state.lastUpdated = null;
    },
    setCacheExpiry(state, action: PayloadAction<number>) {
      state.cacheExpiry = action.payload;
    },
    resetHealthcareHome() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // fetchHomeData
    builder
      .addCase(fetchHomeData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHomeData.fulfilled, (state, action) => {
        state.loading = false;
        state.specialties = action.payload.specialties;
        state.featuredDoctors = action.payload.featuredDoctors;
        if (action.payload.nextAppointment !== undefined) {
          state.nextAppointment = action.payload.nextAppointment;
        }
        state.stats = action.payload.stats;
        if (!action.payload.fromCache) {
          state.lastUpdated = Date.now();
        }
      })
      .addCase(fetchHomeData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Something went wrong';
      });

    // refreshHomeData
    builder
      .addCase(refreshHomeData.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshHomeData.fulfilled, (state, action) => {
        state.refreshing = false;
        state.specialties = action.payload.specialties;
        state.featuredDoctors = action.payload.featuredDoctors;
        state.stats = action.payload.stats;
        state.lastUpdated = Date.now();
      })
      .addCase(refreshHomeData.rejected, (state, action) => {
        state.refreshing = false;
        state.error = (action.payload as string) || 'Refresh failed';
      });

    // searchDoctors
    builder
      .addCase(searchDoctors.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.searchQuery = action.payload.query;
      })
      .addCase(searchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Search failed';
      });
  },
});

// ── Selectors ───────────────────────────────

export const selectSpecialties = (state: { healthcareHome: HealthcareHomeState }) => 
  state.healthcareHome.specialties;

export const selectFeaturedDoctors = (state: { healthcareHome: HealthcareHomeState }) => 
  state.healthcareHome.featuredDoctors;

export const selectIsLoading = (state: { healthcareHome: HealthcareHomeState }) => 
  state.healthcareHome.loading;

export const selectIsRefreshing = (state: { healthcareHome: HealthcareHomeState }) => 
  state.healthcareHome.refreshing;

export const selectError = (state: { healthcareHome: HealthcareHomeState }) => 
  state.healthcareHome.error;

export const selectSearchQuery = (state: { healthcareHome: HealthcareHomeState }) => 
  state.healthcareHome.searchQuery;

export const selectIsCacheValid = (state: { healthcareHome: HealthcareHomeState }) => {
  const { lastUpdated, cacheExpiry } = state.healthcareHome;
  if (!lastUpdated) return false;
  return (Date.now() - lastUpdated) < cacheExpiry;
};

export const selectTopRatedDoctors = (state: { healthcareHome: HealthcareHomeState }) => 
  [...state.healthcareHome.featuredDoctors]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

export const selectSpecialtyById = (specialtyId: string) => 
  (state: { healthcareHome: HealthcareHomeState }) => 
    state.healthcareHome.specialties.find(s => s.specialtyId === specialtyId);

export const selectNextAppointment = (state: { healthcareHome: HealthcareHomeState }) =>
  state.healthcareHome.nextAppointment;

// ── Exports ─────────────────────────────────

export const {
  setFeaturedDoctors,
  setSpecialties,
  setLoading,
  setRefreshing,
  setError,
  clearError,
  setSearchQuery,
  setSelectedSpecialty,
  invalidateCache,
  setCacheExpiry,
  resetHealthcareHome,
} = healthcareHomeSlice.actions;

export default healthcareHomeSlice.reducer;