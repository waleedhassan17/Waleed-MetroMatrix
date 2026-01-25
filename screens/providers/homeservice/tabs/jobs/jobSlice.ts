import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../store/store';

// Types
export type JobStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  status: JobStatus;
  priority: JobPriority;
  customer: {
    id: string;
    name: string;
    avatar: string | null;
    phone: string;
    rating: number;
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
    duration: number; // in minutes
  };
  pricing: {
    amount: number;
    currency: string;
    isPaid: boolean;
  };
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  loading: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [
    {
      id: '1',
      title: 'AC Installation',
      description: 'Install new 1.5 ton split AC in bedroom',
      category: 'hvac',
      status: 'upcoming',
      priority: 'high',
      customer: {
        id: 'c1',
        name: 'Ahmed Khan',
        avatar: null,
        phone: '+92 300 1234567',
        rating: 4.5,
      },
      location: {
        address: 'House 45, Street 12',
        city: 'DHA Phase 5, Lahore',
      },
      schedule: {
        date: '2025-01-26',
        time: '10:00 AM',
        duration: 120,
      },
      pricing: {
        amount: 8500,
        currency: 'PKR',
        isPaid: false,
      },
      createdAt: '2025-01-24T10:00:00Z',
      updatedAt: '2025-01-24T10:00:00Z',
    },
    {
      id: '2',
      title: 'Pipe Leak Repair',
      description: 'Fix leaking pipe in bathroom',
      category: 'plumbing',
      status: 'active',
      priority: 'urgent',
      customer: {
        id: 'c2',
        name: 'Sara Ali',
        avatar: null,
        phone: '+92 301 9876543',
        rating: 4.8,
      },
      location: {
        address: 'Apartment 302, Block C',
        city: 'Gulberg III, Lahore',
      },
      schedule: {
        date: '2025-01-25',
        time: '2:30 PM',
        duration: 60,
      },
      pricing: {
        amount: 3200,
        currency: 'PKR',
        isPaid: false,
      },
      createdAt: '2025-01-23T14:00:00Z',
      updatedAt: '2025-01-25T14:30:00Z',
    },
    {
      id: '3',
      title: 'Electrical Wiring Check',
      description: 'Complete house wiring inspection and repair',
      category: 'electrical',
      status: 'completed',
      priority: 'medium',
      customer: {
        id: 'c3',
        name: 'Usman Sheikh',
        avatar: null,
        phone: '+92 302 5555555',
        rating: 4.2,
      },
      location: {
        address: 'House 78, Block F',
        city: 'Model Town, Lahore',
      },
      schedule: {
        date: '2025-01-24',
        time: '11:00 AM',
        duration: 180,
      },
      pricing: {
        amount: 5500,
        currency: 'PKR',
        isPaid: true,
      },
      rating: 5,
      createdAt: '2025-01-22T09:00:00Z',
      updatedAt: '2025-01-24T15:00:00Z',
    },
    {
      id: '4',
      title: 'Deep House Cleaning',
      description: 'Full house deep cleaning service',
      category: 'cleaning',
      status: 'completed',
      priority: 'low',
      customer: {
        id: 'c4',
        name: 'Fatima Malik',
        avatar: null,
        phone: '+92 303 7777777',
        rating: 4.9,
      },
      location: {
        address: 'Villa 12, Phase 6',
        city: 'Johar Town, Lahore',
      },
      schedule: {
        date: '2025-01-23',
        time: '9:00 AM',
        duration: 240,
      },
      pricing: {
        amount: 6000,
        currency: 'PKR',
        isPaid: true,
      },
      rating: 4,
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-23T14:00:00Z',
    },
    {
      id: '5',
      title: 'Garden Maintenance',
      description: 'Monthly garden maintenance and landscaping',
      category: 'gardening',
      status: 'cancelled',
      priority: 'low',
      customer: {
        id: 'c5',
        name: 'Bilal Ahmed',
        avatar: null,
        phone: '+92 304 8888888',
        rating: 4.0,
      },
      location: {
        address: 'House 90, Sector C',
        city: 'Bahria Town, Lahore',
      },
      schedule: {
        date: '2025-01-27',
        time: '8:00 AM',
        duration: 180,
      },
      pricing: {
        amount: 4500,
        currency: 'PKR',
        isPaid: false,
      },
      notes: 'Customer cancelled due to travel plans',
      createdAt: '2025-01-21T11:00:00Z',
      updatedAt: '2025-01-24T16:00:00Z',
    },
  ],
  currentFilter: 'all',
  searchQuery: '',
  stats: {
    total: 5,
    available: 0,
    today: 1,
    upcoming: 1,
    active: 1,
    completed: 2,
    cancelled: 1,
  },
  loading: false,
  error: null,
};

// Async Thunks
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return initialState.jobs;
    } catch (error) {
      return rejectWithValue('Failed to fetch jobs');
    }
  }
);

export const acceptJob = createAsyncThunk(
  'jobs/acceptJob',
  async (jobId: string, { getState, rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const state = getState() as { jobs: JobsState };
      const job = state.jobs.jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');
      return { ...job, status: 'upcoming' as JobStatus };
    } catch (error) {
      return rejectWithValue('Failed to accept job');
    }
  }
);

export const rejectJob = createAsyncThunk(
  'jobs/rejectJob',
  async (jobId: string, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return jobId;
    } catch (error) {
      return rejectWithValue('Failed to reject job');
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<'all' | JobStatus>) => {
      state.currentFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    updateJobStatus: (
      state,
      action: PayloadAction<{ id: string; status: JobStatus }>
    ) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (job) {
        const oldStatus = job.status;
        job.status = action.payload.status;
        job.updatedAt = new Date().toISOString();

        // Update stats
        if (oldStatus !== action.payload.status) {
          state.stats[oldStatus]--;
          state.stats[action.payload.status]++;
        }
      }
    },
    addJobRating: (
      state,
      action: PayloadAction<{ id: string; rating: number }>
    ) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (job) {
        job.rating = action.payload.rating;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(acceptJob.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((j) => j.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
          state.stats.upcoming++;
        }
      })
      .addCase(rejectJob.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter((j) => j.id !== action.payload);
        state.stats.total--;
      });
  },
});

// Actions
export const {
  setFilter,
  setSearchQuery,
  updateJobStatus,
  addJobRating,
  clearError,
} = jobsSlice.actions;

// Selectors
export const selectAllJobs = (state: RootState) => state.jobs.jobs;
export const selectCurrentFilter = (state: RootState) => state.jobs.currentFilter;
export const selectSearchQuery = (state: RootState) => state.jobs.searchQuery;
export const selectJobsStats = (state: RootState) => state.jobs.stats;
export const selectJobsLoading = (state: RootState) => state.jobs.loading;
export const selectJobsError = (state: RootState) => state.jobs.error;

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