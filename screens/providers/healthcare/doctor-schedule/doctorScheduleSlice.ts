import { toLocalISODate, todayLocalISODate } from '../../../../utils/date/localDate';
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

const todayISO = todayLocalISODate();

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
>('doctorSchedule/fetchSchedule', async (arg, { getState, rejectWithValue }) => {
  try {
    // The arg was declared then discarded (`async (_, ...)`), so the date
    // picker only ever filtered client-side over an upcoming-only list.
    const anchor = arg ?? getState().doctorSchedule.selectedDate;
    const d = new Date(`${anchor}T12:00:00Z`);
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - d.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const iso = (x: Date) => toLocalISODate(x);

    const res = await fetchDoctorScheduleApi({ from: iso(start), to: iso(end) });
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
