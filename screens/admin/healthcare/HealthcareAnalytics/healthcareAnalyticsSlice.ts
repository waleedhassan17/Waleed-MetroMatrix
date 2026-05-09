import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../store/store';

// ============================================
// INTERFACES
// ============================================

interface AppointmentStats {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
}

interface ConsultationBreakdown {
  video: number;
  inClinic: number;
  videoPercentage: number;
  inClinicPercentage: number;
}

export interface TopSpecialty {
  name: string;
  appointments: number;
  revenue: number;
  icon: string;
  color: string;
}

export interface TopDoctor {
  id: string;
  name: string;
  specialty: string;
  appointments: number;
  rating: number;
  revenue: number;
  avatar?: string;
}

export interface RevenueData {
  total: number;
  growth: number;
  monthly: { month: string; amount: number }[];
}

export interface SatisfactionData {
  averageScore: number;
  totalReviews: number;
  distribution: { stars: number; count: number; percentage: number }[];
}

interface ChartData {
  appointmentTrend: { month: string; appointments: number }[];
  revenueBySpecialty: { specialty: string; revenue: number; color: string }[];
  consultationTypeMonthly: { month: string; video: number; inClinic: number }[];
}

export interface HealthcareAnalyticsStats {
  appointments: AppointmentStats;
  consultationBreakdown: ConsultationBreakdown;
  topSpecialties: TopSpecialty[];
  topDoctors: TopDoctor[];
  revenue: RevenueData;
  satisfaction: SatisfactionData;
}

interface HealthcareAnalyticsState {
  stats: HealthcareAnalyticsStats;
  chartData: ChartData;
  dateRange: {
    start: string;
    end: string;
  };
  loading: boolean;
  error: string | null;
  isExporting: boolean;
}

// ============================================
// INITIAL STATE (Dummy Data)
// ============================================

const initialState: HealthcareAnalyticsState = {
  stats: {
    appointments: {
      total: 12458,
      completed: 10890,
      cancelled: 1102,
      noShow: 466,
      completionRate: 87.4,
    },
    consultationBreakdown: {
      video: 5230,
      inClinic: 7228,
      videoPercentage: 42,
      inClinicPercentage: 58,
    },
    topSpecialties: [
      { name: 'General Medicine', appointments: 3200, revenue: 1920000, icon: 'medkit', color: '#3B82F6' },
      { name: 'Dermatology', appointments: 2100, revenue: 1680000, icon: 'body', color: '#8B5CF6' },
      { name: 'Pediatrics', appointments: 1850, revenue: 1110000, icon: 'happy', color: '#10B981' },
      { name: 'Orthopedics', appointments: 1500, revenue: 1350000, icon: 'fitness', color: '#F59E0B' },
      { name: 'Cardiology', appointments: 1200, revenue: 1440000, icon: 'heart', color: '#EF4444' },
    ],
    topDoctors: [
      { id: '1', name: 'Dr. Ahmed Khan', specialty: 'General Medicine', appointments: 456, rating: 4.9, revenue: 273600 },
      { id: '2', name: 'Dr. Fatima Ali', specialty: 'Dermatology', appointments: 389, rating: 4.8, revenue: 311200 },
      { id: '3', name: 'Dr. Usman Malik', specialty: 'Pediatrics', appointments: 342, rating: 4.7, revenue: 205200 },
      { id: '4', name: 'Dr. Ayesha Siddiqui', specialty: 'Cardiology', appointments: 298, rating: 4.9, revenue: 357600 },
      { id: '5', name: 'Dr. Hassan Raza', specialty: 'Orthopedics', appointments: 275, rating: 4.6, revenue: 247500 },
    ],
    revenue: {
      total: 7500000,
      growth: 18.5,
      monthly: [
        { month: 'Jan', amount: 980000 },
        { month: 'Feb', amount: 1050000 },
        { month: 'Mar', amount: 1120000 },
        { month: 'Apr', amount: 1250000 },
        { month: 'May', amount: 1380000 },
        { month: 'Jun', amount: 1720000 },
      ],
    },
    satisfaction: {
      averageScore: 4.6,
      totalReviews: 8945,
      distribution: [
        { stars: 5, count: 4920, percentage: 55 },
        { stars: 4, count: 2236, percentage: 25 },
        { stars: 3, count: 1073, percentage: 12 },
        { stars: 2, count: 447, percentage: 5 },
        { stars: 1, count: 269, percentage: 3 },
      ],
    },
  },
  chartData: {
    appointmentTrend: [
      { month: 'Jan', appointments: 1800 },
      { month: 'Feb', appointments: 1950 },
      { month: 'Mar', appointments: 2100 },
      { month: 'Apr', appointments: 2200 },
      { month: 'May', appointments: 2350 },
      { month: 'Jun', appointments: 2058 },
    ],
    revenueBySpecialty: [
      { specialty: 'General Medicine', revenue: 1920000, color: '#3B82F6' },
      { specialty: 'Dermatology', revenue: 1680000, color: '#8B5CF6' },
      { specialty: 'Pediatrics', revenue: 1110000, color: '#10B981' },
      { specialty: 'Orthopedics', revenue: 1350000, color: '#F59E0B' },
      { specialty: 'Cardiology', revenue: 1440000, color: '#EF4444' },
    ],
    consultationTypeMonthly: [
      { month: 'Jan', video: 720, inClinic: 1080 },
      { month: 'Feb', video: 800, inClinic: 1150 },
      { month: 'Mar', video: 880, inClinic: 1220 },
      { month: 'Apr', video: 950, inClinic: 1250 },
      { month: 'May', video: 1020, inClinic: 1330 },
      { month: 'Jun', video: 860, inClinic: 1198 },
    ],
  },
  dateRange: {
    start: '2025-01-01',
    end: '2025-06-30',
  },
  loading: false,
  error: null,
  isExporting: false,
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchAnalytics = createAsyncThunk(
  'healthcareAnalytics/fetchAnalytics',
  async (
    params: { start: string; end: string } | undefined,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token');

      // TODO: Replace with actual API call
      // const response = await getHealthcareAnalyticsAPI(token, params?.start, params?.end);
      // return response;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return initialState.stats;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch analytics');
    }
  }
);

export const exportReport = createAsyncThunk(
  'healthcareAnalytics/exportReport',
  async (
    format: 'pdf' | 'csv',
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token');

      // TODO: Replace with actual API call
      // const response = await exportHealthcareReportAPI(token, format, state.healthcareAnalytics.dateRange);
      // return response;

      await new Promise(resolve => setTimeout(resolve, 1200));
      return { success: true, format };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to export report');
    }
  }
);

// ============================================
// SLICE
// ============================================

const healthcareAnalyticsSlice = createSlice({
  name: 'healthcareAnalytics',
  initialState,
  reducers: {
    setDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.dateRange = action.payload;
    },
    resetAnalytics: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchAnalytics
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // exportReport
      .addCase(exportReport.pending, (state) => {
        state.isExporting = true;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.isExporting = false;
      })
      .addCase(exportReport.rejected, (state) => {
        state.isExporting = false;
      });
  },
});

export const { setDateRange, resetAnalytics } = healthcareAnalyticsSlice.actions;

// ============================================
// SELECTORS
// ============================================

export const selectHealthcareAnalytics = (state: RootState) => state.healthcareAnalytics;
export const selectAnalyticsStats = (state: RootState) => state.healthcareAnalytics.stats;
export const selectChartData = (state: RootState) => state.healthcareAnalytics.chartData;
export const selectDateRange = (state: RootState) => state.healthcareAnalytics.dateRange;
export const selectAnalyticsLoading = (state: RootState) => state.healthcareAnalytics.loading;
export const selectIsExporting = (state: RootState) => state.healthcareAnalytics.isExporting;

export default healthcareAnalyticsSlice.reducer;
