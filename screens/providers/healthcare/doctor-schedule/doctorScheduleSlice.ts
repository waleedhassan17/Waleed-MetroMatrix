import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Appointment } from '../../../../models/healthcare/types';
import { fetchDoctorScheduleApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export type ViewMode = 'day' | 'week';

export interface DoctorScheduleState {
  selectedDate: string;
  appointments: Appointment[];
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
}

const todayISO = new Date().toISOString().split('T')[0];

const initialState: DoctorScheduleState = {
  selectedDate: todayISO,
  appointments: [],
  viewMode: 'day',
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchSchedule = createAsyncThunk<
  Appointment[],
  string | undefined,
  { state: { doctorSchedule: DoctorScheduleState }; rejectValue: string }
>('doctorSchedule/fetchSchedule', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorScheduleApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load schedule');
  }
});

// ── Slice ───────────────────────────────────

const doctorScheduleSlice = createSlice({
  name: 'doctorSchedule',
  initialState,
  reducers: {
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    },
    resetDoctorSchedule() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const { setSelectedDate, setViewMode, resetDoctorSchedule } = doctorScheduleSlice.actions;

export default doctorScheduleSlice.reducer;
