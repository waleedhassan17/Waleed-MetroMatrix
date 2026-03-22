import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Appointment } from '../../../../models/healthcare/types';
import { fetchAppointmentsApi } from '../../../../networks/healthcare/appointmentApi';

// ── State ───────────────────────────────────

type ActiveTab = 'upcoming' | 'past';

interface MyAppointmentsState {
  appointments: Appointment[];
  activeTab: ActiveTab;
  loading: boolean;
  error: string | null;
}

const initialState: MyAppointmentsState = {
  appointments: [],
  activeTab: 'upcoming',
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchMyAppointments = createAsyncThunk<
  Appointment[],
  { patientId: string; status?: Appointment['status'] },
  { rejectValue: string }
>('myAppointments/fetchMyAppointments', async (params, { rejectWithValue }) => {
  try {
    const res = await fetchAppointmentsApi(params);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data.appointments;
  } catch {
    return rejectWithValue('Failed to load appointments');
  }
});

// ── Slice ───────────────────────────────────

const myAppointmentsSlice = createSlice({
  name: 'myAppointments',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<ActiveTab>) {
      state.activeTab = action.payload;
    },
    resetMyAppointments() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchMyAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  setActiveTab,
  resetMyAppointments,
} = myAppointmentsSlice.actions;

export default myAppointmentsSlice.reducer;
