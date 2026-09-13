import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { DoctorAppointment, PatientSummary } from '../../../../models/healthcare/doctorHub';
import { fetchDoctorAppointments, fetchMyPatients } from '../../../../networks/healthcare/doctorHubApi';
import { todayDateKey } from '../../../../utils/healthcare/timeRanges';

// ============================================================================
// Patients: today's appointments, and everyone the doctor has seen.
//
// The old "queue" invented token numbers and "~15 min wait" estimates from
// array position, had a "call next patient" action that made no request, and
// replaced every row with a new object on each 30-second poll so the whole
// list re-rendered even when nothing had changed.
// ============================================================================

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const PAGE_SIZE = 20;

export interface PatientQueueState {
  today: DoctorAppointment[];
  todayKey: string;
  todayStatus: LoadStatus;
  todayRefreshing: boolean;
  todayError: string | null;
  lastFetchedAt: number | null;

  patients: PatientSummary[];
  query: string;
  page: number;
  hasMore: boolean;
  patientsStatus: LoadStatus;
  loadingMore: boolean;
  patientsError: string | null;
}

const initialState: PatientQueueState = {
  today: [],
  todayKey: todayDateKey(),
  todayStatus: 'idle',
  todayRefreshing: false,
  todayError: null,
  lastFetchedAt: null,

  patients: [],
  query: '',
  page: 0,
  hasMore: true,
  patientsStatus: 'idle',
  loadingMore: false,
  patientsError: null,
};

const signature = (list: DoctorAppointment[]) => list.map((a) => `${a.id}:${a.status}:${a.startTime}`).join('|');

export const fetchToday = createAsyncThunk<
  { dateKey: string; appointments: DoctorAppointment[] },
  { refresh?: boolean; silent?: boolean } | undefined,
  { rejectValue: string }
>('patientQueue/fetchToday', async (_arg, { rejectWithValue }) => {
  const dateKey = todayDateKey();
  const res = await fetchDoctorAppointments({ date: dateKey, limit: 100 });
  if (!res.success) return rejectWithValue(res.message || "We couldn't load today's patients");
  return { dateKey, appointments: res.data.appointments.filter((a) => a.status !== 'cancelled') };
});

export const fetchPatients = createAsyncThunk<
  { query: string; page: number; patients: PatientSummary[]; pages: number },
  { query: string; page: number },
  { rejectValue: string }
>('patientQueue/fetchPatients', async ({ query, page }, { rejectWithValue }) => {
  const res = await fetchMyPatients({ q: query || undefined, page, limit: PAGE_SIZE });
  if (!res.success) return rejectWithValue(res.message || "We couldn't load your patients");
  return { query, page, patients: res.data.patients, pages: res.data.pagination.pages };
});

const patientQueueSlice = createSlice({
  name: 'patientQueue',
  initialState,
  reducers: {
    resetPatientQueue() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchToday.pending, (state, action) => {
        if (action.meta.arg?.refresh) state.todayRefreshing = true;
        if (state.todayStatus !== 'ready') state.todayStatus = 'loading';
        if (!action.meta.arg?.silent) state.todayError = null;
      })
      .addCase(fetchToday.fulfilled, (state, action) => {
        state.todayRefreshing = false;
        state.todayStatus = 'ready';
        state.todayError = null;
        state.lastFetchedAt = Date.now();
        // Only replace the list when something changed, so a poll that brings
        // nothing new does not re-render every row.
        if (state.todayKey !== action.payload.dateKey || signature(state.today) !== signature(action.payload.appointments)) {
          state.today = action.payload.appointments;
          state.todayKey = action.payload.dateKey;
        }
      })
      .addCase(fetchToday.rejected, (state, action) => {
        state.todayRefreshing = false;
        // A failed background poll stays quiet; the list on screen is still right.
        if (action.meta.arg?.silent && state.todayStatus === 'ready') return;
        state.todayError = action.payload ?? "We couldn't load today's patients";
        state.todayStatus = state.today.length ? 'ready' : 'error';
      })
      .addCase(fetchPatients.pending, (state, action) => {
        const first = action.meta.arg.page <= 1;
        if (first) {
          state.query = action.meta.arg.query;
          if (state.patientsStatus !== 'ready') state.patientsStatus = 'loading';
        } else {
          state.loadingMore = true;
        }
        state.patientsError = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loadingMore = false;
        // Results for a search the doctor has since changed are dropped.
        if (action.payload.query !== state.query) return;
        state.patients =
          action.payload.page <= 1 ? action.payload.patients : [...state.patients, ...action.payload.patients];
        state.page = action.payload.page;
        state.hasMore = action.payload.page < action.payload.pages;
        state.patientsStatus = 'ready';
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loadingMore = false;
        if (action.meta.arg.query !== state.query) return;
        state.patientsError = action.payload ?? "We couldn't load your patients";
        state.patientsStatus = state.patients.length ? 'ready' : 'error';
      });
  },
});

export const { resetPatientQueue } = patientQueueSlice.actions;

export default patientQueueSlice.reducer;
