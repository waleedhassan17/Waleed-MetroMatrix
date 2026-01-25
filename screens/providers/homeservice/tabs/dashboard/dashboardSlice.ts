import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../store/store';

// Types
export interface DashboardProfile {
  name: string;
  avatar: string | null;
  rating: number;
  isOnline: boolean;
  isPro: boolean;
  unreadNotifications: number;
}

export interface DashboardStats {
  todayJobs: number;
  weekJobs: number;
  completionRate: number;
}

export interface DashboardInsight {
  id: string;
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  icon: string;
  bgColor: string;
  color: string;
  trend: 'up' | 'down';
  subtitle: string;
}

export interface DashboardJob {
  id: string;
  title: string;
  customer: string;
  customerAvatar: string | null;
  time: string;
  date: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'available' | 'completed';
  price: number;
  category: string;
  phone?: string;
}

export interface RecentActivity {
  id: string;
  type: 'job_completed' | 'booking' | 'payment' | 'review';
  title: string;
  description: string;
  time: string;
  amount?: number;
  color: string;
  status: 'Completed' | 'Pending' | 'In Progress';
}

interface DashboardState {
  profile: DashboardProfile;
  stats: DashboardStats;
  insights: DashboardInsight[];
  todayJobs: DashboardJob[];
  availableJobs: DashboardJob[];
  upcomingJobs: DashboardJob[];
  recentActivity: RecentActivity[];
  jobs: {
    today: DashboardJob[];
    available: DashboardJob[];
  };
  activeTab: 'today' | 'available';
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  profile: {
    name: 'Waleed Hassan',
    avatar: null,
    rating: 4.8,
    isOnline: true,
    isPro: true,
    unreadNotifications: 3,
  },
  stats: {
    todayJobs: 3,
    weekJobs: 18,
    completionRate: 98,
  },
  insights: [
    {
      id: '1',
      title: 'Earnings',
      value: 'Rs 8,500',
      change: 12,
      isPositive: true,
      icon: 'trending-up',
      bgColor: '#ECFDF5',
      color: '#059669',
      trend: 'up',
      subtitle: 'vs last week',
    },
    {
      id: '2',
      title: 'Response',
      value: '15 min',
      change: -8,
      isPositive: true,
      icon: 'clock',
      bgColor: '#EFF6FF',
      color: '#3B82F6',
      trend: 'down',
      subtitle: 'avg response time',
    },
    {
      id: '3',
      title: 'Rating',
      value: '4.8',
      change: 2,
      isPositive: true,
      icon: 'star',
      bgColor: '#FFFBEB',
      color: '#F59E0B',
      trend: 'up',
      subtitle: 'customer rating',
    },
    {
      id: '4',
      title: 'Repeat',
      value: '78%',
      change: 5,
      isPositive: true,
      icon: 'users',
      bgColor: '#EDE9FE',
      color: '#8B5CF6',
      trend: 'up',
      subtitle: 'repeat customers',
    },
  ],
  todayJobs: [
    {
      id: '1',
      title: 'AC Installation',
      customer: 'Ahmed Khan',
      customerAvatar: null,
      time: '10:00 AM',
      date: 'Today',
      location: 'DHA Phase 5, Lahore',
      status: 'scheduled',
      price: 8500,
      category: 'HVAC',
      phone: '+92 300 1234567',
    },
    {
      id: '2',
      title: 'Pipe Leak Repair',
      customer: 'Sara Ali',
      customerAvatar: null,
      time: '2:30 PM',
      date: 'Today',
      location: 'Gulberg III, Lahore',
      status: 'in_progress',
      price: 3200,
      category: 'Plumbing',
      phone: '+92 301 9876543',
    },
    {
      id: '3',
      title: 'Electrical Wiring',
      customer: 'Usman Sheikh',
      customerAvatar: null,
      time: '5:00 PM',
      date: 'Today',
      location: 'Model Town, Lahore',
      status: 'scheduled',
      price: 5500,
      category: 'Electrical',
      phone: '+92 302 5555555',
    },
  ],
  availableJobs: [
    {
      id: '4',
      title: 'Water Heater Installation',
      customer: 'Fatima Malik',
      customerAvatar: null,
      time: '11:00 AM',
      date: 'Tomorrow',
      location: 'Johar Town, Lahore',
      status: 'available',
      price: 6000,
      category: 'Plumbing',
    },
    {
      id: '5',
      title: 'AC Service',
      customer: 'Bilal Ahmed',
      customerAvatar: null,
      time: '3:00 PM',
      date: 'Tomorrow',
      location: 'Bahria Town, Lahore',
      status: 'available',
      price: 2500,
      category: 'HVAC',
    },
  ],
  upcomingJobs: [],
  recentActivity: [
    {
      id: '1',
      type: 'job_completed',
      title: 'Job Completed',
      description: 'Plumbing repair at Cantt',
      time: '2 hours ago',
      amount: 4500,
      color: '#059669',
      status: 'Completed',
    },
    {
      id: '2',
      type: 'booking',
      title: 'New Booking',
      description: 'AC Installation confirmed',
      time: '4 hours ago',
      color: '#3B82F6',
      status: 'Pending',
    },
    {
      id: '3',
      type: 'payment',
      title: 'Payment Received',
      description: 'Electrical work payment',
      time: 'Yesterday',
      amount: 3200,
      color: '#8B5CF6',
      status: 'Completed',
    },
  ],
  jobs: {
    today: [],
    available: [],
  },
  activeTab: 'today',
  loading: false,
  refreshing: false,
  error: null,
};

// Async Thunks
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        profile: initialState.profile,
        stats: initialState.stats,
        insights: initialState.insights,
        todayJobs: initialState.todayJobs,
        availableJobs: initialState.availableJobs,
        recentActivity: initialState.recentActivity,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch dashboard data');
    }
  }
);

export const refreshDashboard = createAsyncThunk(
  'dashboard/refresh',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        profile: initialState.profile,
        stats: initialState.stats,
        insights: initialState.insights,
        todayJobs: initialState.todayJobs,
        availableJobs: initialState.availableJobs,
        recentActivity: initialState.recentActivity,
      };
    } catch (error) {
      return rejectWithValue('Failed to refresh dashboard');
    }
  }
);

export const acceptJob = createAsyncThunk(
  'dashboard/acceptJob',
  async (jobId: string, { getState, rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const state = getState() as { dashboard: DashboardState };
      const job = state.dashboard.availableJobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');
      return { ...job, status: 'scheduled' as const };
    } catch (error) {
      return rejectWithValue('Failed to accept job');
    }
  }
);

export const rejectJob = createAsyncThunk(
  'dashboard/rejectJob',
  async (jobId: string, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return jobId;
    } catch (error) {
      return rejectWithValue('Failed to reject job');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<'today' | 'available'>) => {
      state.activeTab = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<DashboardProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    toggleOnlineStatus: (state) => {
      state.profile.isOnline = !state.profile.isOnline;
    },
    markNotificationsRead: (state) => {
      state.profile.unreadNotifications = 0;
    },
    addActivity: (state, action: PayloadAction<RecentActivity>) => {
      state.recentActivity.unshift(action.payload);
      if (state.recentActivity.length > 10) {
        state.recentActivity.pop();
      }
    },
    clearError: (state) => {
      state.error = null;
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
        state.profile = action.payload.profile;
        state.stats = action.payload.stats;
        state.insights = action.payload.insights;
        state.todayJobs = action.payload.todayJobs;
        state.availableJobs = action.payload.availableJobs;
        state.recentActivity = action.payload.recentActivity;
        state.jobs = {
          today: action.payload.todayJobs,
          available: action.payload.availableJobs,
        };
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshDashboard.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(refreshDashboard.fulfilled, (state, action) => {
        state.refreshing = false;
        state.profile = action.payload.profile;
        state.stats = action.payload.stats;
        state.insights = action.payload.insights;
        state.todayJobs = action.payload.todayJobs;
        state.availableJobs = action.payload.availableJobs;
        state.recentActivity = action.payload.recentActivity;
        state.jobs = {
          today: action.payload.todayJobs,
          available: action.payload.availableJobs,
        };
      })
      .addCase(refreshDashboard.rejected, (state) => {
        state.refreshing = false;
      })
      .addCase(acceptJob.fulfilled, (state, action) => {
        state.availableJobs = state.availableJobs.filter(
          (job) => job.id !== action.payload.id
        );
        state.todayJobs.push(action.payload);
        state.jobs = {
          today: state.todayJobs,
          available: state.availableJobs,
        };
        state.stats.todayJobs += 1;
      })
      .addCase(rejectJob.fulfilled, (state, action) => {
        state.availableJobs = state.availableJobs.filter(
          (job) => job.id !== action.payload
        );
        state.jobs = {
          today: state.todayJobs,
          available: state.availableJobs,
        };
      });
  },
});

// Actions
export const {
  setActiveTab,
  updateProfile,
  toggleOnlineStatus,
  markNotificationsRead,
  addActivity,
  clearError,
} = dashboardSlice.actions;

// Selectors
export const selectDashboardProfile = (state: RootState) => state.dashboard.profile;
export const selectDashboardStats = (state: RootState) => state.dashboard.stats;
export const selectDashboardInsights = (state: RootState) => state.dashboard.insights;
export const selectTodayJobs = (state: RootState) => state.dashboard.todayJobs;
export const selectAvailableJobs = (state: RootState) => state.dashboard.availableJobs;
export const selectRecentActivity = (state: RootState) => state.dashboard.recentActivity;
export const selectActiveTab = (state: RootState) => state.dashboard.activeTab;
export const selectDashboardLoading = (state: RootState) => state.dashboard.loading;
export const selectDashboardRefreshing = (state: RootState) => state.dashboard.refreshing;
export const selectDashboardError = (state: RootState) => state.dashboard.error;

export default dashboardSlice.reducer;