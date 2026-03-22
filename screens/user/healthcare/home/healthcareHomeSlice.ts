import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Doctor, Specialty } from '../../../../models/healthcare/types';
import { fetchSpecialtiesApi, fetchDoctorsApi } from '../../../../networks/healthcare/doctorApi';

// ── State Interface ─────────────────────────

export interface HealthcareHomeState {
  featuredDoctors: Doctor[];
  specialties: Specialty[];
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

const initialState: HealthcareHomeState = {
  featuredDoctors: [],
  specialties: [],
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
  searchQuery: '',
  selectedSpecialtyId: null,
  cacheExpiry: CACHE_DURATION,
};

// ── Async Thunks ────────────────────────────

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
          fromCache: true,
        };
      }

      const [specialtiesRes, doctorsRes] = await Promise.all([
        fetchSpecialtiesApi(),
        fetchDoctorsApi({ sort: 'rating', limit: 6 }),
      ]);

      if (!specialtiesRes.success && !doctorsRes.success) {
        return rejectWithValue('Failed to fetch data. Please try again.');
      }

      return {
        specialties: specialtiesRes.success ? specialtiesRes.data : [],
        featuredDoctors: doctorsRes.success ? doctorsRes.data.doctors : [],
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