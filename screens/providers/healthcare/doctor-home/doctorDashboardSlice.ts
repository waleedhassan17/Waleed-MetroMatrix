import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Appointment } from '../../../../models/healthcare/types';
import { fetchDoctorDashboardApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export interface TodayStats {
  totalAppointments: number;
  patientsSeen: number;
  pending: number;
  cancelled: number;
}

export interface DoctorEarnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  currency: string;
}

export interface DoctorDashboardState {
  doctorName: string;
  todayStats: TodayStats;
  upcomingAppointments: Appointment[];
  earnings: DoctorEarnings;
  loading: boolean;
  error: string | null;
}

const initialState: DoctorDashboardState = {
  doctorName: '',
  todayStats: { totalAppointments: 0, patientsSeen: 0, pending: 0, cancelled: 0 },
  upcomingAppointments: [],
  earnings: { today: 0, thisWeek: 0, thisMonth: 0, currency: 'PKR' },
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchDashboardData = createAsyncThunk<
  Omit<DoctorDashboardState, 'loading' | 'error'>,
  void,
  { rejectValue: string }
>('doctorDashboard/fetchDashboardData', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorDashboardApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return {
      doctorName: res.data.doctorName,
      todayStats: res.data.todayStats,
      upcomingAppointments: res.data.upcomingAppointments,
      earnings: res.data.earnings,
    };
  } catch {
    return rejectWithValue('Failed to load dashboard data');
  }
});

export const refreshDashboard = createAsyncThunk<
  Omit<DoctorDashboardState, 'loading' | 'error'>,
  void,
  { rejectValue: string }
>('doctorDashboard/refreshDashboard', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorDashboardApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return {
      doctorName: res.data.doctorName,
      todayStats: res.data.todayStats,
      upcomingAppointments: res.data.upcomingAppointments,
      earnings: res.data.earnings,
    };
  } catch {
    return rejectWithValue('Failed to refresh dashboard');
  }
});

// ── Slice ───────────────────────────────────

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
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.doctorName = action.payload.doctorName;
        state.todayStats = action.payload.todayStats;
        state.upcomingAppointments = action.payload.upcomingAppointments;
        state.earnings = action.payload.earnings;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      .addCase(refreshDashboard.fulfilled, (state, action) => {
        state.doctorName = action.payload.doctorName;
        state.todayStats = action.payload.todayStats;
        state.upcomingAppointments = action.payload.upcomingAppointments;
        state.earnings = action.payload.earnings;
      });
  },
});

export const { resetDoctorDashboard } = doctorDashboardSlice.actions;

export default doctorDashboardSlice.reducer;
