import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface JobInProgressState {
  jobId: string;
  serviceType: string;
  category: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  specialInstructions: string;
  estimatedPrice: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  workStarted: boolean;
  workCompleted: boolean;
  startTime: string | null;
  endTime: string | null;
  actualDuration: number | null; // in minutes
  isLoading: boolean;
  error: string | null;
}

const initialState: JobInProgressState = {
  jobId: '',
  serviceType: '',
  category: '',
  customerName: '',
  customerPhone: '',
  address: '',
  city: '',
  specialInstructions: '',
  estimatedPrice: 0,
  coordinates: {
    latitude: 0,
    longitude: 0,
  },
  workStarted: false,
  workCompleted: false,
  startTime: null,
  endTime: null,
  actualDuration: null,
  isLoading: false,
  error: null,
};

const jobInProgressSlice = createSlice({
  name: 'jobInProgress',
  initialState,
  reducers: {
    // Set job in progress data
    setJobInProgressData: (state, action: PayloadAction<{
      jobId: string;
      serviceType: string;
      category: string;
      customerName: string;
      customerPhone: string;
      address: string;
      city: string;
      specialInstructions?: string;
      estimatedPrice?: number;
      coordinates: { latitude: number; longitude: number };
    }>) => {
      state.jobId = action.payload.jobId;
      state.serviceType = action.payload.serviceType;
      state.category = action.payload.category;
      state.customerName = action.payload.customerName;
      state.customerPhone = action.payload.customerPhone;
      state.address = action.payload.address;
      state.city = action.payload.city;
      state.specialInstructions = action.payload.specialInstructions || '';
      state.estimatedPrice = action.payload.estimatedPrice || 0;
      state.coordinates = action.payload.coordinates;
      state.workStarted = false;
      state.workCompleted = false;
      state.startTime = null;
      state.endTime = null;
      state.actualDuration = null;
    },

    // Start work
    startWork: (state) => {
      state.workStarted = true;
      state.startTime = new Date().toISOString();
    },

    // Complete work
    completeWork: (state) => {
      state.workCompleted = true;
      state.endTime = new Date().toISOString();
      
      // Calculate duration
      if (state.startTime) {
        const start = new Date(state.startTime).getTime();
        const end = new Date().getTime();
        state.actualDuration = Math.round((end - start) / 60000);
      }
    },

    // Update actual duration (for manual override)
    updateDuration: (state, action: PayloadAction<number>) => {
      state.actualDuration = action.payload;
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

    // Reset job in progress state
    resetJobInProgress: () => initialState,
  },
});

export const {
  setJobInProgressData,
  startWork,
  completeWork,
  updateDuration,
  setLoading,
  setError,
  clearError,
  resetJobInProgress,
} = jobInProgressSlice.actions;

export default jobInProgressSlice.reducer;