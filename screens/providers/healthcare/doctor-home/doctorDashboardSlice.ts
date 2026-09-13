import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { DoctorDashboard } from '../../../../models/healthcare/doctorHub';
import { fetchDoctorDashboard } from '../../../../networks/healthcare/doctorHubApi';
import {
  fetchAvailabilityStatusApi,
  refreshMySlotsApi,
  type AvailabilityStatus,
} from '../../../../networks/healthcare/providerApi';

// ============================================================================
// Doctor Home.
//
// The old slice started at `loading: false` with no data, so the screen's
// "loading && no name" gate let the first render through, then unmounted
// everything a frame later when `pending` landed — which remounted the wallet
// card and availability banner and fired both of their requests twice. The
// status here says exactly which of the four situations the screen is in, and
// `refreshing` is separate so a pull-to-refresh never blanks what is showing.
// ============================================================================

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DoctorDashboardState {
  data: DoctorDashboard | null;
  /** How much bookable runway the doctor has — drives the warning banner. */
  availability: AvailabilityStatus | null;
  status: LoadStatus;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  extending: boolean;
}

const initialState: DoctorDashboardState = {
  data: null,
  availability: null,
  status: 'idle',
  refreshing: false,
  error: null,
  lastFetchedAt: null,
  extending: false,
};

export const fetchDashboard = createAsyncThunk<
  { dashboard: DoctorDashboard; availability: AvailabilityStatus | null },
  { refresh?: boolean } | undefined,
  { rejectValue: string }
>('doctorDashboard/fetch', async (_arg, { rejectWithValue }) => {
  // In parallel. A failed availability check stays silent rather than
  // alarming a doctor whose hours may be perfectly fine.
  const [dashboard, availability] = await Promise.all([
    fetchDoctorDashboard(),
    fetchAvailabilityStatusApi().catch(() => null),
  ]);
  if (!dashboard.success) return rejectWithValue(dashboard.message || "We couldn't load your dashboard");
  return {
    dashboard: dashboard.data,
    availability: availability && availability.success ? availability.data : null,
  };
});

/** Top the rolling horizon back up now, then reload. */
export const extendAvailability = createAsyncThunk<true, void, { rejectValue: string }>(
  'doctorDashboard/extendAvailability',
  async (_arg, { dispatch, rejectWithValue }) => {
    const res = await refreshMySlotsApi();
    if (!res.success) return rejectWithValue(res.message || "We couldn't extend your availability");
    await dispatch(fetchDashboard({ refresh: true }));
    return true;
  }
);

const doctorDashboardSlice = createSlice({
  name: 'doctorDashboard',
  initialState,
  reducers: {
    resetDoctorDashboard() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state, action) => {
        if (action.meta.arg?.refresh) state.refreshing = true;
        if (!state.data) state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.data = action.payload.dashboard;
        state.availability = action.payload.availability;
        state.status = 'ready';
        state.refreshing = false;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload ?? "We couldn't load your dashboard";
        // Data already on screen stays on screen; only a first load fails.
        state.status = state.data ? 'ready' : 'error';
      })
      .addCase(extendAvailability.pending, (state) => {
        state.extending = true;
      })
      .addCase(extendAvailability.fulfilled, (state) => {
        state.extending = false;
      })
      .addCase(extendAvailability.rejected, (state) => {
        state.extending = false;
      });
  },
});

export const { resetDoctorDashboard } = doctorDashboardSlice.actions;

export default doctorDashboardSlice.reducer;
