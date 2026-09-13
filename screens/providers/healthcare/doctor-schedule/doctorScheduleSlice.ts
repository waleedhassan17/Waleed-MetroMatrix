import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { DoctorAppointment } from '../../../../models/healthcare/doctorHub';
import { fetchDoctorAppointments } from '../../../../networks/healthcare/doctorHubApi';
import { addDaysToKey, mondayOf, todayDateKey } from '../../../../utils/healthcare/timeRanges';

// ============================================================================
// Doctor Schedule.
//
// Weeks start on Monday and are computed in LOCAL days. The previous version
// built the week with UTC arithmetic and formatted it locally, and started it
// on Sunday while Availability started on Monday, so the two screens disagreed
// about which days a week held.
// ============================================================================

export type ScheduleView = 'day' | 'week' | 'requests';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DoctorScheduleState {
  view: ScheduleView;
  selectedDate: string;
  weekStart: string;
  /** The loaded week — only ever the one in `weekStart`. */
  appointments: DoctorAppointment[];
  loadedWeek: string | null;
  status: LoadStatus;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  /** Requests awaiting approval, from today on. */
  requests: DoctorAppointment[];
  requestsStatus: LoadStatus;
  requestsError: string | null;
}

const today = todayDateKey();

const initialState: DoctorScheduleState = {
  view: 'day',
  selectedDate: today,
  weekStart: mondayOf(today),
  appointments: [],
  loadedWeek: null,
  status: 'idle',
  refreshing: false,
  error: null,
  lastFetchedAt: null,
  requests: [],
  requestsStatus: 'idle',
  requestsError: null,
};

export const fetchWeek = createAsyncThunk<
  { weekStart: string; appointments: DoctorAppointment[] },
  { weekStart: string; refresh?: boolean },
  { rejectValue: string }
>('doctorSchedule/fetchWeek', async ({ weekStart }, { rejectWithValue }) => {
  const res = await fetchDoctorAppointments({ from: weekStart, to: addDaysToKey(weekStart, 6), limit: 200 });
  if (!res.success) return rejectWithValue(res.message || "We couldn't load your schedule");
  return { weekStart, appointments: res.data.appointments.filter((a) => a.status !== 'cancelled') };
});

export const fetchRequests = createAsyncThunk<DoctorAppointment[], void, { rejectValue: string }>(
  'doctorSchedule/fetchRequests',
  async (_arg, { rejectWithValue }) => {
    const res = await fetchDoctorAppointments({ status: 'upcoming', limit: 100 });
    if (!res.success) return rejectWithValue(res.message || "We couldn't load your requests");
    return res.data.appointments.filter((a) => a.status === 'pending');
  }
);

const doctorScheduleSlice = createSlice({
  name: 'doctorSchedule',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<ScheduleView>) {
      state.view = action.payload;
    },
    selectDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
      const monday = mondayOf(action.payload);
      if (monday !== state.weekStart) {
        state.weekStart = monday;
        // A different week: drop the old week's rows rather than showing them
        // under the new dates while it loads.
        state.appointments = [];
        state.loadedWeek = null;
        state.status = 'idle';
      }
    },
    resetDoctorSchedule() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeek.pending, (state, action) => {
        if (action.meta.arg.refresh) state.refreshing = true;
        if (state.loadedWeek !== action.meta.arg.weekStart) state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWeek.fulfilled, (state, action) => {
        state.refreshing = false;
        // A slow response for a week the doctor has already left is ignored.
        if (action.payload.weekStart !== state.weekStart) return;
        state.appointments = action.payload.appointments;
        state.loadedWeek = action.payload.weekStart;
        state.status = 'ready';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchWeek.rejected, (state, action) => {
        state.refreshing = false;
        if (action.meta.arg.weekStart !== state.weekStart) return;
        state.error = action.payload ?? "We couldn't load your schedule";
        state.status = state.loadedWeek === state.weekStart ? 'ready' : 'error';
      })
      .addCase(fetchRequests.pending, (state) => {
        if (state.requestsStatus !== 'ready') state.requestsStatus = 'loading';
        state.requestsError = null;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.requests = action.payload;
        state.requestsStatus = 'ready';
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        state.requestsError = action.payload ?? "We couldn't load your requests";
        state.requestsStatus = state.requests.length ? 'ready' : 'error';
      });
  },
});

export const { setView, selectDate, resetDoctorSchedule } = doctorScheduleSlice.actions;

export default doctorScheduleSlice.reducer;
