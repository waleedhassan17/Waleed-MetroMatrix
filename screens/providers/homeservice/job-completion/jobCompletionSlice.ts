import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { submitJobCompletion, fetchJobCompletionData } from '../../../../networks/serviceProviders/jobNetwork';

export interface JobCompletionState {
  jobId: string;
  serviceType: string;
  customerName: string;
  actualDuration: number | null;
  earnings: number;
  paymentMethod: 'online' | 'cash' | null;
  transactionId: string | null;
  completedAt: string | null;
  rating: number | null;
  review: string | null;
  isCompleted: boolean;
  stats: {
    totalJobsDone: number;
    averageRating: number;
    levelProgress: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: JobCompletionState = {
  jobId: '',
  serviceType: '',
  customerName: '',
  actualDuration: null,
  earnings: 0,
  paymentMethod: null,
  transactionId: null,
  completedAt: null,
  rating: null,
  review: null,
  isCompleted: false,
  stats: {
    totalJobsDone: 0,
    averageRating: 4.8,
    levelProgress: 85,
  },
  isLoading: false,
  error: null,
};

const jobCompletionSlice = createAppSlice({
  name: 'jobCompletion',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchJobCompletionDataAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await fetchJobCompletionData(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch completion data.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to fetch completion data.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.jobId = action.payload.jobId;
          state.serviceType = action.payload.serviceType;
          state.customerName = action.payload.customerName;
          state.actualDuration = action.payload.actualDuration;
          state.earnings = action.payload.earnings;
          state.paymentMethod = action.payload.paymentMethod;
          state.transactionId = action.payload.transactionId;
          state.completedAt = new Date().toISOString();
          state.isCompleted = true;
          state.stats = action.payload.stats;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    submitCompletionAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await submitJobCompletion(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to submit completion.');
          }
          return response.data.completed;
        } catch (error) {
          return rejectWithValue('Failed to submit completion.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
        },
        fulfilled: (state) => {
          state.isLoading = false;
          state.isCompleted = true;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setJobCompletionData: create.reducer(
      (
        state,
        action: PayloadAction<{
          jobId: string;
          serviceType: string;
          customerName: string;
          actualDuration: number | null;
          earnings: number;
          paymentMethod: 'online' | 'cash';
          transactionId: string | null;
        }>
      ) => {
        state.jobId = action.payload.jobId;
        state.serviceType = action.payload.serviceType;
        state.customerName = action.payload.customerName;
        state.actualDuration = action.payload.actualDuration;
        state.earnings = action.payload.earnings;
        state.paymentMethod = action.payload.paymentMethod;
        state.transactionId = action.payload.transactionId;
        state.completedAt = new Date().toISOString();
        state.isCompleted = true;
      }
    ),

    setRating: create.reducer((state, action: PayloadAction<number>) => {
      state.rating = action.payload;
      state.stats.averageRating =
        (state.stats.averageRating * state.stats.totalJobsDone + action.payload) /
        (state.stats.totalJobsDone + 1);
    }),

    setReview: create.reducer((state, action: PayloadAction<string>) => {
      state.review = action.payload;
    }),

    updateStats: create.reducer(
      (
        state,
        action: PayloadAction<{
          totalJobsDone?: number;
          averageRating?: number;
          levelProgress?: number;
        }>
      ) => {
        if (action.payload.totalJobsDone !== undefined) {
          state.stats.totalJobsDone = action.payload.totalJobsDone;
        }
        if (action.payload.averageRating !== undefined) {
          state.stats.averageRating = action.payload.averageRating;
        }
        if (action.payload.levelProgress !== undefined) {
          state.stats.levelProgress = action.payload.levelProgress;
        }
      }
    ),

    incrementJobsDone: create.reducer((state) => {
      state.stats.totalJobsDone += 1;
      state.stats.levelProgress = Math.min(100, state.stats.levelProgress + 5);
    }),

    markFullyCompleted: create.reducer((state) => {
      state.isCompleted = true;
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

    resetJobCompletion: create.reducer(() => initialState),
  }),
  selectors: {
    selectJobId: (state) => state.jobId,
    selectServiceType: (state) => state.serviceType,
    selectCustomerName: (state) => state.customerName,
    selectActualDuration: (state) => state.actualDuration,
    selectEarnings: (state) => state.earnings,
    selectPaymentMethod: (state) => state.paymentMethod,
    selectTransactionId: (state) => state.transactionId,
    selectCompletedAt: (state) => state.completedAt,
    selectRating: (state) => state.rating,
    selectReview: (state) => state.review,
    selectIsCompleted: (state) => state.isCompleted,
    selectStats: (state) => state.stats,
    selectIsLoading: (state) => state.isLoading,
    selectError: (state) => state.error,
  },
});

export const {
  fetchJobCompletionDataAsync,
  submitCompletionAsync,
  setJobCompletionData,
  setRating,
  setReview,
  updateStats,
  incrementJobsDone,
  markFullyCompleted,
  setLoading,
  setError,
  clearError,
  resetJobCompletion,
} = jobCompletionSlice.actions;

export const {
  selectJobId,
  selectServiceType,
  selectCustomerName,
  selectActualDuration,
  selectEarnings,
  selectPaymentMethod,
  selectTransactionId,
  selectCompletedAt,
  selectRating,
  selectReview,
  selectIsCompleted,
  selectStats,
  selectIsLoading,
  selectError,
} = jobCompletionSlice.selectors;

export default jobCompletionSlice.reducer;