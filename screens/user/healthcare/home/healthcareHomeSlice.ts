import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { HealthcareHome } from '../../../../models/healthcare/types';
import { fetchHealthcareHomeApi } from '../../../../networks/healthcare/homeApi';

// ── State Interface ─────────────────────────

export interface HealthcareHomeState {
  /** The whole page from GET /home (null until the first load lands). */
  home: HealthcareHome | null;
  /** The city the patient chose; null means "whatever the server picks". */
  city: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  cityPicker: boolean;
  cacheExpiry: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const initialState: HealthcareHomeState = {
  home: null,
  city: null,
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
  cityPicker: false,
  cacheExpiry: CACHE_DURATION,
};

// ── Async Thunks ────────────────────────────

/**
 * The home in one call. A fresh copy (younger than the cache window, same
 * city) is reused unless `force` is set — pull-to-refresh and a city change
 * always force, so neither can come back with the page it already had.
 */
export const fetchHomeData = createAsyncThunk(
  'healthcareHome/fetchHomeData',
  async (
    args: { city?: string | null; force?: boolean } | void,
    { getState, rejectWithValue }
  ) => {
    const state = (getState() as { healthcareHome: HealthcareHomeState }).healthcareHome;
    const city = args && args.city !== undefined ? args.city : state.city;
    const fresh =
      state.home && state.lastUpdated && Date.now() - state.lastUpdated < state.cacheExpiry && (city ?? null) === (state.city ?? null);
    if (fresh && !(args && args.force)) return { home: state.home as HealthcareHome, city, fromCache: true };

    try {
      const res = await fetchHealthcareHomeApi(city);
      if (!res.success) return rejectWithValue(res.message || 'We could not load healthcare. Please try again.');
      return { home: res.data, city, fromCache: false };
    } catch (error: any) {
      if (error?.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please check your network.');
      }
      return rejectWithValue(error?.message || 'Something went wrong. Please try again.');
    }
  }
);

// ── Slice ───────────────────────────────────

const healthcareHomeSlice = createSlice({
  name: 'healthcareHome',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setCityPicker(state, action: PayloadAction<boolean>) {
      state.cityPicker = action.payload;
    },
    invalidateCache(state) {
      state.lastUpdated = null;
    },
    resetHealthcareHome() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeData.pending, (state, action) => {
        // A refresh keeps the page on screen; only the first load shows skeletons.
        if (action.meta.arg && action.meta.arg.force && state.home) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchHomeData.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.home = action.payload.home;
        state.city = action.payload.city ?? null;
        if (!action.payload.fromCache) state.lastUpdated = Date.now();
      })
      .addCase(fetchHomeData.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Something went wrong';
      });
  },
});

// ── Selectors ───────────────────────────────

type Root = { healthcareHome: HealthcareHomeState };

export const selectHealthcareHome = (state: Root) => state.healthcareHome;
export const selectHomeData = (state: Root) => state.healthcareHome.home;
export const selectNextAppointment = (state: Root) => state.healthcareHome.home?.upcoming ?? null;

// ── Exports ─────────────────────────────────

export const { clearError, setCityPicker, invalidateCache, resetHealthcareHome } = healthcareHomeSlice.actions;

export default healthcareHomeSlice.reducer;
