import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const jobDetailSlice = createSlice({
  name: 'jobDetail',
  initialState,
  reducers: {
    // Set job data
    setJobDetail: (state, action: PayloadAction<JobData>) => {
      state.job = action.payload;
      state.isLoading = false;
      state.error = null;
      state.isNavigationStarted = false;
      state.navigationStartedAt = null;
    },

    // Update specific job fields
    updateJobDetail: (state, action: PayloadAction<Partial<JobData>>) => {
      if (state.job) {
        state.job = { ...state.job, ...action.payload };
      }
    },

    // Start navigation to customer
    startNavigation: (state) => {
      state.isNavigationStarted = true;
      state.navigationStartedAt = new Date().toISOString();
    },

    // Stop navigation
    stopNavigation: (state) => {
      state.isNavigationStarted = false;
      state.navigationStartedAt = null;
    },

    // Accept job
    acceptJob: (state) => {
      if (state.job) {
        state.job.status = 'accepted';
        state.jobAcceptedAt = new Date().toISOString();
      }
    },

    // Start job (when provider arrives)
    startJob: (state) => {
      if (state.job) {
        state.job.status = 'in_progress';
      }
    },

    // Complete job
    completeJob: (state) => {
      if (state.job) {
        state.job.status = 'completed';
      }
    },

    // Cancel job
    cancelJob: (state) => {
      if (state.job) {
        state.job.status = 'cancelled';
      }
    },

    // Set estimated arrival time
    setEstimatedArrival: (state, action: PayloadAction<string>) => {
      state.estimatedArrivalTime = action.payload;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset job detail state
    resetJobDetail: () => initialState,
  },
});

export const {
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
export const selectJobDetail = (state: { jobDetail: JobDetailState }) => state.jobDetail.job;
export const selectIsLoading = (state: { jobDetail: JobDetailState }) => state.jobDetail.isLoading;
export const selectIsNavigationStarted = (state: { jobDetail: JobDetailState }) => state.jobDetail.isNavigationStarted;
export const selectJobStatus = (state: { jobDetail: JobDetailState }) => state.jobDetail.job?.status;
export const selectEstimatedArrival = (state: { jobDetail: JobDetailState }) => state.jobDetail.estimatedArrivalTime;

export default jobDetailSlice.reducer;