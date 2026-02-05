import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  startJobWork,
  completeJobWork,
  fetchJobDetail,
  fetchJobInProgressData,
} from '../../../../networks/serviceProviders/jobNetwork';

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

const jobInProgressSlice = createAppSlice({
  name: 'jobInProgress',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchJobInProgressDataAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await fetchJobInProgressData(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch job data.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to fetch job data.');
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
          state.category = action.payload.category;
          state.customerName = action.payload.customerName;
          state.customerPhone = action.payload.customerPhone;
          state.address = action.payload.address;
          state.city = action.payload.city;
          state.specialInstructions = action.payload.specialInstructions || '';
          state.estimatedPrice = action.payload.estimatedPrice;
          state.coordinates = action.payload.coordinates;
          state.workStarted = false;
          state.workCompleted = false;
          state.startTime = null;
          state.endTime = null;
          state.actualDuration = null;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    startWorkAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await startJobWork(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to start work.');
          }
          return response.data.startTime;
        } catch (error) {
          return rejectWithValue('Failed to start work.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.workStarted = true;
          state.startTime = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    completeWorkAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await completeJobWork(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to complete work.');
          }
          return {
            endTime: response.data.endTime,
            duration: response.data.duration,
          };
        } catch (error) {
          return rejectWithValue('Failed to complete work.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.workCompleted = true;
          state.endTime = action.payload.endTime;
          state.actualDuration = action.payload.duration;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setJobInProgressData: create.reducer(
      (
        state,
        action: PayloadAction<{
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
        }>
      ) => {
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
      }
    ),

    startWork: create.reducer((state) => {
      state.workStarted = true;
      state.startTime = new Date().toISOString();
    }),

    completeWork: create.reducer((state) => {
      state.workCompleted = true;
      state.endTime = new Date().toISOString();
      if (state.startTime) {
        const start = new Date(state.startTime).getTime();
        const end = new Date().getTime();
        state.actualDuration = Math.round((end - start) / 60000);
      }
    }),

    updateDuration: create.reducer((state, action: PayloadAction<number>) => {
      state.actualDuration = action.payload;
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

    resetJobInProgress: create.reducer(() => initialState),
  }),
  selectors: {
    selectJobId: (state) => state.jobId,
    selectServiceType: (state) => state.serviceType,
    selectCategory: (state) => state.category,
    selectCustomerName: (state) => state.customerName,
    selectCustomerPhone: (state) => state.customerPhone,
    selectAddress: (state) => state.address,
    selectCity: (state) => state.city,
    selectSpecialInstructions: (state) => state.specialInstructions,
    selectEstimatedPrice: (state) => state.estimatedPrice,
    selectCoordinates: (state) => state.coordinates,
    selectWorkStarted: (state) => state.workStarted,
    selectWorkCompleted: (state) => state.workCompleted,
    selectStartTime: (state) => state.startTime,
    selectEndTime: (state) => state.endTime,
    selectActualDuration: (state) => state.actualDuration,
    selectIsLoading: (state) => state.isLoading,
    selectError: (state) => state.error,
  },
});

export const {
  fetchJobInProgressDataAsync,
  startWorkAsync,
  completeWorkAsync,
  setJobInProgressData,
  startWork,
  completeWork,
  updateDuration,
  setLoading,
  setError,
  clearError,
  resetJobInProgress,
} = jobInProgressSlice.actions;

export const {
  selectJobId,
  selectServiceType,
  selectCategory,
  selectCustomerName,
  selectCustomerPhone,
  selectAddress,
  selectCity,
  selectSpecialInstructions,
  selectEstimatedPrice,
  selectCoordinates,
  selectWorkStarted,
  selectWorkCompleted,
  selectStartTime,
  selectEndTime,
  selectActualDuration,
  selectIsLoading,
  selectError,
} = jobInProgressSlice.selectors;

export default jobInProgressSlice.reducer;