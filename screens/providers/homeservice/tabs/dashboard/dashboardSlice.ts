import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../../store/createAppSlice';
import type { RootState } from '../../../../../store/store';
import { DashboardData, DashboardJob } from '../../../../../models/serviceProviders';
import { dashboardDataSerializer, dashboardJobSerializer } from '../../../../../serializers/serviceProviders';
import { fetchProviderDashboard } from '../../../../../networks/serviceProviders/dashboardNetwork';
import { updateProviderOnlineStatus } from '../../../../../networks/serviceProviders/providerNetwork';
import { acceptJob as acceptJobApi, rejectJob as rejectJobApi } from '../../../../../networks/serviceProviders/jobNetwork';

// Types - keeping local types for backward compatibility
export interface DashboardProfile {
  id?: string;
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
  change?: number;
  isPositive?: boolean;
  icon?: string;
  bgColor?: string;
  color: string;
  trend: 'up' | 'down';
  subtitle?: string;
}

export interface DashboardJobLocal {
  id: string;
  title: string;
  customer: string;
  customerAvatar: string | null;
  time: string;
  date: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'available' | 'completed' | 'pending' | 'confirmed';
  price: number;
  category: string;
  phone?: string;
}

export interface RecentActivity {
  id: string;
  type: 'job_completed' | 'booking' | 'payment' | 'review' | string;
  title?: string;
  message?: string;
  description?: string;
  time: string;
  amount?: number;
  color?: string;
  status?: 'Completed' | 'Pending' | 'In Progress';
}

interface DashboardState {
  profile: DashboardProfile;
  stats: DashboardStats;
  insights: DashboardInsight[];
  todayJobs: DashboardJobLocal[];
  availableJobs: DashboardJobLocal[];
  upcomingJobs: DashboardJobLocal[];
  recentActivity: RecentActivity[];
  jobs: {
    today: DashboardJobLocal[];
    available: DashboardJobLocal[];
    pending: DashboardJobLocal[];
    upcoming: DashboardJobLocal[];
  };
  activeTab: 'today' | 'available';
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  profile: {
    name: '',
    avatar: null,
    rating: 0,
    isOnline: false,
    isPro: false,
    unreadNotifications: 0,
  },
  stats: {
    todayJobs: 0,
    weekJobs: 0,
    completionRate: 0,
  },
  insights: [],
  todayJobs: [],
  availableJobs: [],
  upcomingJobs: [],
  recentActivity: [],
  jobs: {
    today: [],
    available: [],
    pending: [],
    upcoming: [],
  },
  activeTab: 'today',
  loading: false,
  refreshing: false,
  error: null,
};

// Helper to map API response to local types
const mapDashboardData = (data: DashboardData): Partial<DashboardState> => {
  const mapJob = (job: DashboardJob): DashboardJobLocal => ({
    id: job.id,
    title: job.title,
    customer: job.customer,
    customerAvatar: job.customerAvatar || null,
    time: job.time,
    date: job.date,
    location: job.location,
    status: job.status as DashboardJobLocal['status'],
    price: job.price,
    category: job.category,
    phone: job.phone,
  });

  return {
    profile: {
      id: data.profile.id,
      name: data.profile.name,
      avatar: data.profile.avatar || null,
      rating: data.profile.rating,
      isOnline: data.profile.isOnline,
      isPro: data.profile.isPro,
      unreadNotifications: data.profile.unreadNotifications,
    },
    stats: data.stats,
    insights: data.insights.map((i) => ({
      id: i.id,
      title: i.title,
      value: i.value,
      color: i.color,
      trend: i.trend,
      bgColor: i.bgColor,
    })),
    todayJobs: (data.jobs.today || []).map(mapJob),
    availableJobs: (data.jobs.pending || []).map(mapJob),
    upcomingJobs: (data.jobs.upcoming || []).map(mapJob),
    recentActivity: data.recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      time: a.time,
    })),
  };
};

// Slice using createAppSlice
const dashboardSlice = createAppSlice({
  name: 'dashboard',
  initialState,
  reducers: (create) => ({
    // Fetch dashboard data
    fetchDashboardData: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        const response = await fetchProviderDashboard();
        
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to fetch dashboard data');
        }

        return dashboardDataSerializer(response.data);
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          const mapped = mapDashboardData(action.payload);
          Object.assign(state, mapped);
          state.jobs = {
            today: state.todayJobs,
            available: state.availableJobs,
            pending: state.availableJobs,
            upcoming: state.upcomingJobs,
          };
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string || 'Failed to fetch dashboard data';
        },
      }
    ),

    // Refresh dashboard
    refreshDashboard: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        const response = await fetchProviderDashboard();
        
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to refresh dashboard');
        }

        return dashboardDataSerializer(response.data);
      },
      {
        pending: (state) => {
          state.refreshing = true;
        },
        fulfilled: (state, action) => {
          state.refreshing = false;
          const mapped = mapDashboardData(action.payload);
          Object.assign(state, mapped);
          state.jobs = {
            today: state.todayJobs,
            available: state.availableJobs,
            pending: state.availableJobs,
            upcoming: state.upcomingJobs,
          };
        },
        rejected: (state) => {
          state.refreshing = false;
        },
      }
    ),

    // Accept job
    acceptJob: create.asyncThunk(
      async (jobId: string, { getState, rejectWithValue }) => {
        const response = await acceptJobApi(jobId);
        
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to accept job');
        }

        const state = (getState() as any).dashboard as DashboardState;
        const job = state.availableJobs.find((j) => j.id === jobId);
        if (!job) {
          return rejectWithValue('Job not found');
        }
        
        return { ...job, status: 'scheduled' as const };
      },
      {
        fulfilled: (state, action) => {
          state.availableJobs = state.availableJobs.filter(
            (job) => job.id !== action.payload.id
          );
          state.todayJobs.push(action.payload);
          state.jobs = {
            today: state.todayJobs,
            available: state.availableJobs,
            pending: state.availableJobs,
            upcoming: state.upcomingJobs,
          };
          state.stats.todayJobs += 1;
        },
        rejected: (state, action) => {
          state.error = action.payload as string || 'Failed to accept job';
        },
      }
    ),

    // Reject job
    rejectJob: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        const response = await rejectJobApi(jobId);
        
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to reject job');
        }

        return jobId;
      },
      {
        fulfilled: (state, action) => {
          state.availableJobs = state.availableJobs.filter(
            (job) => job.id !== action.payload
          );
          state.jobs = {
            today: state.todayJobs,
            available: state.availableJobs,
            pending: state.availableJobs,
            upcoming: state.upcomingJobs,
          };
        },
        rejected: (state, action) => {
          state.error = action.payload as string || 'Failed to reject job';
        },
      }
    ),

    // Toggle online status
    toggleOnlineStatus: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        const state = (getState() as any).dashboard as DashboardState;
        const newStatus = !state.profile.isOnline;
        
        const response = await updateProviderOnlineStatus(newStatus);
        
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to update status');
        }

        return newStatus;
      },
      {
        fulfilled: (state, action) => {
          state.profile.isOnline = action.payload;
        },
        rejected: (state, action) => {
          state.error = action.payload as string || 'Failed to update status';
        },
      }
    ),

    // Sync reducers
    setActiveTab: create.reducer((state, action: PayloadAction<'today' | 'available'>) => {
      state.activeTab = action.payload;
    }),

    updateProfile: create.reducer((state, action: PayloadAction<Partial<DashboardProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    }),

    markNotificationsRead: create.reducer((state) => {
      state.profile.unreadNotifications = 0;
    }),

    addActivity: create.reducer((state, action: PayloadAction<RecentActivity>) => {
      state.recentActivity.unshift(action.payload);
      if (state.recentActivity.length > 10) {
        state.recentActivity.pop();
      }
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectDashboardProfile: (state) => state.profile,
    selectDashboardStats: (state) => state.stats,
    selectDashboardInsights: (state) => state.insights,
    selectTodayJobs: (state) => state.todayJobs,
    selectAvailableJobs: (state) => state.availableJobs,
    selectUpcomingJobs: (state) => state.upcomingJobs,
    selectRecentActivity: (state) => state.recentActivity,
    selectActiveTab: (state) => state.activeTab,
    selectDashboardLoading: (state) => state.loading,
    selectDashboardRefreshing: (state) => state.refreshing,
    selectDashboardError: (state) => state.error,
    selectJobs: (state) => state.jobs,
  },
});

// Actions
export const {
  fetchDashboardData,
  refreshDashboard,
  acceptJob,
  rejectJob,
  toggleOnlineStatus,
  setActiveTab,
  updateProfile,
  markNotificationsRead,
  addActivity,
  clearError,
} = dashboardSlice.actions;

// Selectors
export const {
  selectDashboardProfile,
  selectDashboardStats,
  selectDashboardInsights,
  selectTodayJobs,
  selectAvailableJobs,
  selectUpcomingJobs,
  selectRecentActivity,
  selectActiveTab,
  selectDashboardLoading,
  selectDashboardRefreshing,
  selectDashboardError,
  selectJobs,
} = dashboardSlice.selectors;

export default dashboardSlice.reducer;