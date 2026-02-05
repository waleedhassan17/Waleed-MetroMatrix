import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchJobDetail,
  acceptJob as acceptJobApi,
  startJob as startJobApi,
  completeJob as completeJobApi,
} from '../../../../networks/serviceProviders/jobNetwork';
import { jobDetailSerializer } from '../../../../serializers/serviceProviders';
import type { JobDetail } from '../../../../models/serviceProviders';

export interface JobData {
  id: string;
  serviceType: string;
  category: string;
  customerName: string;
  customerPhone: string;
  customerImage?: string;
  customerRating?: number;
  customerReviewCount?: number;
  address: string;
  city: string;
  date: string;
  time: string;
  specialInstructions?: string;
  estimatedPrice?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Additional fields from Book Service
  serviceDescription?: string;
  urgencyLevel?: 'normal' | 'urgent' | 'emergency';
  preferredPaymentMethod?: string;
  bookingId?: string;
  createdAt?: string;
  status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  // Provider-specific fields
  estimatedDuration?: string;
  distanceFromProvider?: number;
  responseTimeRequired?: number; // in minutes
}

export interface JobDetailState {
  job: JobData | null;
  isLoading: boolean;
  error: string | null;
  isNavigationStarted: boolean;
  navigationStartedAt: string | null;
  jobAcceptedAt: string | null;
  estimatedArrivalTime: string | null;
}

const initialState: JobDetailState = {
  job: null,
  isLoading: false,
  error: null,
  isNavigationStarted: false,
  navigationStartedAt: null,
  jobAcceptedAt: null,
  estimatedArrivalTime: null,
};

// Helper function to map API job detail to local format
const mapApiJobToLocal = (apiData: JobDetail): JobData => ({
  id: apiData.id,
  serviceType: apiData.serviceType,
  category: apiData.category,
  customerName: apiData.customerName || apiData.customer,
  customerPhone: apiData.customerPhone,
  customerImage: apiData.customerAvatar || apiData.customerImage,
  customerRating: undefined, // Not in API
  customerReviewCount: undefined, // Not in API
  address: apiData.location,
  city: apiData.city,
  date: apiData.date,
  time: apiData.time,
  specialInstructions: apiData.specialInstructions,
  estimatedPrice: apiData.estimatedPrice || apiData.price,
  coordinates: {
    latitude: apiData.coordinates.latitude,
    longitude: apiData.coordinates.longitude,
  },
  serviceDescription: apiData.title,
  urgencyLevel: 'normal',
  preferredPaymentMethod: undefined,
  bookingId: undefined,
  createdAt: undefined,
  status: apiData.status as JobData['status'],
  estimatedDuration: undefined,
  distanceFromProvider: undefined,
  responseTimeRequired: undefined,
});

const jobDetailSlice = createAppSlice({
  name: 'jobDetail',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchJobDetailData: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        const response = await fetchJobDetail(jobId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch job detail');
        }
        const serialized = jobDetailSerializer(response.data);
        return mapApiJobToLocal(serialized);
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.job = action.payload;
          state.isNavigationStarted = false;
          state.navigationStartedAt = null;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    acceptJobAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        const response = await acceptJobApi(jobId);
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to accept job');
        }
        return new Date().toISOString();
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          if (state.job) {
            state.job.status = 'accepted';
            state.jobAcceptedAt = action.payload;
          }
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    startJobAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        const response = await startJobApi(jobId);
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to start job');
        }
        return true;
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state) => {
          state.isLoading = false;
          if (state.job) {
            state.job.status = 'in_progress';
          }
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    completeJobAsync: create.asyncThunk(
      async (params: { jobId: string; finalAmount?: number; notes?: string }, { rejectWithValue }) => {
        const response = await completeJobApi({
          jobId: params.jobId,
          finalAmount: params.finalAmount || 0,
          notes: params.notes,
        });
        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to complete job');
        }
        return true;
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state) => {
          state.isLoading = false;
          if (state.job) {
            state.job.status = 'completed';
          }
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setJobDetail: create.reducer((state, action: PayloadAction<JobData>) => {
      state.job = action.payload;
      state.isLoading = false;
      state.error = null;
      state.isNavigationStarted = false;
      state.navigationStartedAt = null;
    }),

    updateJobDetail: create.reducer((state, action: PayloadAction<Partial<JobData>>) => {
      if (state.job) {
        state.job = { ...state.job, ...action.payload };
      }
    }),

    startNavigation: create.reducer((state) => {
      state.isNavigationStarted = true;
      state.navigationStartedAt = new Date().toISOString();
    }),

    stopNavigation: create.reducer((state) => {
      state.isNavigationStarted = false;
      state.navigationStartedAt = null;
    }),

    acceptJob: create.reducer((state) => {
      if (state.job) {
        state.job.status = 'accepted';
        state.jobAcceptedAt = new Date().toISOString();
      }
    }),

    startJob: create.reducer((state) => {
      if (state.job) {
        state.job.status = 'in_progress';
      }
    }),

    completeJob: create.reducer((state) => {
      if (state.job) {
        state.job.status = 'completed';
      }
    }),

    cancelJob: create.reducer((state) => {
      if (state.job) {
        state.job.status = 'cancelled';
      }
    }),

    setEstimatedArrival: create.reducer((state, action: PayloadAction<string>) => {
      state.estimatedArrivalTime = action.payload;
    }),

    setLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }),

    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),

    resetJobDetail: create.reducer(() => initialState),
  }),
  selectors: {
    selectJobDetail: (state) => state.job,
    selectIsLoading: (state) => state.isLoading,
    selectIsNavigationStarted: (state) => state.isNavigationStarted,
    selectJobStatus: (state) => state.job?.status,
    selectEstimatedArrival: (state) => state.estimatedArrivalTime,
    selectError: (state) => state.error,
    selectJobAcceptedAt: (state) => state.jobAcceptedAt,
  },
});

export const {
  fetchJobDetailData,
  acceptJobAsync,
  startJobAsync,
  completeJobAsync,
  setJobDetail,
  updateJobDetail,
  startNavigation,
  stopNavigation,
  acceptJob,
  startJob,
  completeJob,
  cancelJob,
  setEstimatedArrival,
  setLoading,
  setError,
  clearError,
  resetJobDetail,
} = jobDetailSlice.actions;

// Selectors
export const {
  selectJobDetail,
  selectIsLoading,
  selectIsNavigationStarted,
  selectJobStatus,
  selectEstimatedArrival,
  selectError,
  selectJobAcceptedAt,
} = jobDetailSlice.selectors;

export default jobDetailSlice.reducer;