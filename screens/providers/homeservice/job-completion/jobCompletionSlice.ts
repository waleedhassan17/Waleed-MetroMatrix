import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const jobCompletionSlice = createSlice({
  name: 'jobCompletion',
  initialState,
  reducers: {
    // Set job completion data
    setJobCompletionData: (state, action: PayloadAction<{
      jobId: string;
      serviceType: string;
      customerName: string;
      actualDuration: number | null;
      earnings: number;
      paymentMethod: 'online' | 'cash';
      transactionId: string | null;
    }>) => {
      state.jobId = action.payload.jobId;
      state.serviceType = action.payload.serviceType;
      state.customerName = action.payload.customerName;
      state.actualDuration = action.payload.actualDuration;
      state.earnings = action.payload.earnings;
      state.paymentMethod = action.payload.paymentMethod;
      state.transactionId = action.payload.transactionId;
      state.completedAt = new Date().toISOString();
      state.isCompleted = true;
    },

    // Set rating from customer
    setRating: (state, action: PayloadAction<number>) => {
      state.rating = action.payload;
      // Update average rating (simplified calculation)
      state.stats.averageRating = 
        (state.stats.averageRating * state.stats.totalJobsDone + action.payload) /
        (state.stats.totalJobsDone + 1);
    },

    // Set review from customer
    setReview: (state, action: PayloadAction<string>) => {
      state.review = action.payload;
    },

    // Update stats
    updateStats: (state, action: PayloadAction<{
      totalJobsDone?: number;
      averageRating?: number;
      levelProgress?: number;
    }>) => {
      if (action.payload.totalJobsDone !== undefined) {
        state.stats.totalJobsDone = action.payload.totalJobsDone;
      }
      if (action.payload.averageRating !== undefined) {
        state.stats.averageRating = action.payload.averageRating;
      }
      if (action.payload.levelProgress !== undefined) {
        state.stats.levelProgress = action.payload.levelProgress;
      }
    },

    // Increment jobs done count
    incrementJobsDone: (state) => {
      state.stats.totalJobsDone += 1;
      // Increase level progress
      state.stats.levelProgress = Math.min(100, state.stats.levelProgress + 5);
    },

    // Mark as fully completed (after animations, etc.)
    markFullyCompleted: (state) => {
      state.isCompleted = true;
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

    // Reset job completion state
    resetJobCompletion: () => initialState,
  },
});

export const {
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

export default jobCompletionSlice.reducer;