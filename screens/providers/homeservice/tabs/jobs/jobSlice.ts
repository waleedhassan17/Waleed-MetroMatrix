import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../../store/createAppSlice';
import type { RootState } from '../../../../../store/store';
import { Job as ApiJob, JobStats as ApiJobStats, Pagination } from '../../../../../models/serviceProviders';
import { jobListSerializer, paginationSerializer } from '../../../../../serializers/serviceProviders';
import { fetchProviderJobs, acceptJob as acceptJobApi, rejectJob as rejectJobApi } from '../../../../../networks/serviceProviders/jobNetwork';

// Types
export type JobStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'today';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Job {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: JobStatus;
  priority?: JobPriority;
  customer: {
    id?: string;
    name: string;
    avatar: string | null;
    phone: string;
    rating?: number;
  };
  location: {
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  schedule: {
    date: string;
    time: string;
    duration?: number;
  };
  pricing: {
    amount: number;
    currency: string;
    isPaid?: boolean;
  };
  rating?: number;
  notes?: string;
  specialInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface JobStats {
  total: number;
  available: number;
  today: number;
  upcoming: number;
  active: number;
  completed: number;
  cancelled: number;
}

interface JobsState {
  jobs: Job[];
  currentFilter: 'all' | JobStatus;
  searchQuery: string;
  stats: JobStats;
  pagination: Pagination;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  currentFilter: 'all',
  searchQuery: '',
  stats: {
    total: 0,
    available: 0,
    today: 0,
    upcoming: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
    hasNext: false,
    hasPrevious: false,
  },
  loading: false,
  refreshing: false,
  error: null,
};

// Helper to map API job to local Job type
const mapApiJobToLocal = (apiJob: ApiJob): Job => ({
  id: apiJob.id,
  title: apiJob.title,
  description: apiJob.serviceType,
  category: apiJob.category,
  status: apiJob.status as JobStatus,
  customer: {
    name: apiJob.customer,
    avatar: apiJob.customerAvatar || null,
    phone: apiJob.customerPhone || '',
  },
  location: {
    address: apiJob.location,
    city: apiJob.city || '',
    coordinates: apiJob.coordinates ? {
      lat: apiJob.coordinates.latitude,
      lng: apiJob.coordinates.longitude,
    } : undefined,
  },
  schedule: {
    date: apiJob.date,
    time: apiJob.time,
  },
  pricing: {
    amount: apiJob.price,
    currency: 'PKR',
  },
  specialInstructions: apiJob.specialInstructions,
});

// Slice using createAppSlice
const jobsSlice = createAppSlice({
  name: 'jobs',
  initialState,
  reducers: (create) => ({
    // Fetch jobs
    fetchJobs: create.asyncThunk(
      async (params: { status?: string; page?: number } | void, { rejectWithValue }) => {
        const response = await fetchProviderJobs({
          status: params?.status,
          page: params?.page || 1,
          limit: 15,
        });

        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to fetch jobs');
        }

        const { jobs, stats, pagination } = response.data;
        return {
          jobs: jobs.map(mapApiJobToLocal),
          stats: {
            total: stats.total,
            available: 0,
            today: stats.today,
            upcoming: stats.upcoming,
            active: 0,
            completed: stats.completed,
            cancelled: stats.cancelled || 0,
          },
          pagination: paginationSerializer(pagination),
        };
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.jobs = action.payload.jobs;
          state.stats = action.payload.stats;
          state.pagination = action.payload.pagination;
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string || 'Failed to fetch jobs';
        },
      }
    ),

    // Refresh jobs
    refreshJobs: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        const state = (getState() as any).jobs as JobsState;
        const status = state.currentFilter === 'all' ? undefined : state.currentFilter;
        
        const response = await fetchProviderJobs({
          status,
          page: 1,
          limit: 15,
        });

        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to refresh jobs');
        }

        const { jobs, stats, pagination } = response.data;
        return {
          jobs: jobs.map(mapApiJobToLocal),
          stats: {
            total: stats.total,
            available: 0,
            today: stats.today,
            upcoming: stats.upcoming,
            active: 0,
            completed: stats.completed,
            cancelled: stats.cancelled || 0,
          },
          pagination: paginationSerializer(pagination),
        };
      },
      {
        pending: (state) => {
          state.refreshing = true;
        },
        fulfilled: (state, action) => {
          state.refreshing = false;
          state.jobs = action.payload.jobs;
          state.stats = action.payload.stats;
          state.pagination = action.payload.pagination;
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

        const state = (getState() as any).jobs as JobsState;
        const job = state.jobs.find((j) => j.id === jobId);
        if (!job) {
          return rejectWithValue('Job not found');
        }
        
        return { ...job, status: 'upcoming' as JobStatus };
      },
      {
        fulfilled: (state, action) => {
          const index = state.jobs.findIndex((j) => j.id === action.payload.id);
          if (index !== -1) {
            state.jobs[index] = action.payload;
            state.stats.upcoming++;
          }
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
          state.jobs = state.jobs.filter((j) => j.id !== action.payload);
          state.stats.total--;
        },
        rejected: (state, action) => {
          state.error = action.payload as string || 'Failed to reject job';
        },
      }
    ),

    // Sync reducers
    setFilter: create.reducer((state, action: PayloadAction<'all' | JobStatus>) => {
      state.currentFilter = action.payload;
    }),

    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),

    updateJobStatus: create.reducer(
      (state, action: PayloadAction<{ id: string; status: JobStatus }>) => {
        const job = state.jobs.find((j) => j.id === action.payload.id);
        if (job) {
          const oldStatus = job.status;
          job.status = action.payload.status;

          // Update stats
          if (oldStatus !== action.payload.status) {
            if (oldStatus in state.stats) {
              (state.stats as any)[oldStatus]--;
            }
            if (action.payload.status in state.stats) {
              (state.stats as any)[action.payload.status]++;
            }
          }
        }
      }
    ),

    addJobRating: create.reducer(
      (state, action: PayloadAction<{ id: string; rating: number }>) => {
        const job = state.jobs.find((j) => j.id === action.payload.id);
        if (job) {
          job.rating = action.payload.rating;
        }
      }
    ),

    clearError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectAllJobs: (state) => state.jobs,
    selectCurrentFilter: (state) => state.currentFilter,
    selectSearchQuery: (state) => state.searchQuery,
    selectJobsStats: (state) => state.stats,
    selectJobsPagination: (state) => state.pagination,
    selectJobsLoading: (state) => state.loading,
    selectJobsRefreshing: (state) => state.refreshing,
    selectJobsError: (state) => state.error,
  },
});

// Actions
export const {
  fetchJobs,
  refreshJobs,
  acceptJob,
  rejectJob,
  setFilter,
  setSearchQuery,
  updateJobStatus,
  addJobRating,
  clearError,
} = jobsSlice.actions;

// Selectors
export const {
  selectAllJobs,
  selectCurrentFilter,
  selectSearchQuery,
  selectJobsStats,
  selectJobsPagination,
  selectJobsLoading,
  selectJobsRefreshing,
  selectJobsError,
} = jobsSlice.selectors;

// Computed selectors
export const selectFilteredJobs = (state: RootState) => {
  const { jobs, currentFilter, searchQuery } = state.jobs;

  let filtered = jobs;

  // Apply status filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter((job) => job.status === currentFilter);
  }

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.customer.name.toLowerCase().includes(query) ||
        job.location.city.toLowerCase().includes(query)
    );
  }

  return filtered;
};

export const selectJobsByStatus = (status: JobStatus) => (state: RootState) =>
  state.jobs.jobs.filter((job) => job.status === status);

export const selectJobById = (id: string) => (state: RootState) =>
  state.jobs.jobs.find((job) => job.id === id);

export default jobsSlice.reducer;