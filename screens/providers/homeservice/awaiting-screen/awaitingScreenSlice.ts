import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchAwaitingApprovalData,
  checkJobApprovalStatus,
} from '../../../../networks/serviceProviders/jobNetwork';

export interface AwaitingApprovalState {
  jobId: string;
  serviceType: string;
  customerName: string;
  address: string;
  actualDuration: number | null;
  estimatedPrice: number;
  isApproved: boolean;
  approvalTime: string | null;
  waitingStartTime: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AwaitingApprovalState = {
  jobId: '',
  serviceType: '',
  customerName: '',
  address: '',
  actualDuration: null,
  estimatedPrice: 0,
  isApproved: false,
  approvalTime: null,
  waitingStartTime: null,
  isLoading: false,
  error: null,
};

const awaitingApprovalSlice = createAppSlice({
  name: 'awaitingApproval',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchAwaitingApprovalDataAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await fetchAwaitingApprovalData(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch approval data.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to fetch approval data.');
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
          state.address = action.payload.address;
          state.actualDuration = action.payload.actualDuration;
          state.estimatedPrice = action.payload.estimatedPrice;
          state.isApproved = false;
          state.approvalTime = null;
          state.waitingStartTime = new Date().toISOString();
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    checkApprovalStatusAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await checkJobApprovalStatus(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to check approval status.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to check approval status.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.isApproved = action.payload.isApproved;
          if (action.payload.approvalTime) {
            state.approvalTime = action.payload.approvalTime;
          }
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setAwaitingApprovalData: create.reducer(
      (
        state,
        action: PayloadAction<{
          jobId: string;
          serviceType: string;
          customerName: string;
          address: string;
          actualDuration: number | null;
          estimatedPrice: number;
        }>
      ) => {
        state.jobId = action.payload.jobId;
        state.serviceType = action.payload.serviceType;
        state.customerName = action.payload.customerName;
        state.address = action.payload.address;
        state.actualDuration = action.payload.actualDuration;
        state.estimatedPrice = action.payload.estimatedPrice;
        state.isApproved = false;
        state.approvalTime = null;
        state.waitingStartTime = new Date().toISOString();
      }
    ),

    approveJob: create.reducer((state) => {
      state.isApproved = true;
      state.approvalTime = new Date().toISOString();
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

    resetAwaitingApproval: create.reducer(() => initialState),
  }),
  selectors: {
    selectJobId: (state) => state.jobId,
    selectServiceType: (state) => state.serviceType,
    selectCustomerName: (state) => state.customerName,
    selectAddress: (state) => state.address,
    selectActualDuration: (state) => state.actualDuration,
    selectEstimatedPrice: (state) => state.estimatedPrice,
    selectIsApproved: (state) => state.isApproved,
    selectApprovalTime: (state) => state.approvalTime,
    selectWaitingStartTime: (state) => state.waitingStartTime,
    selectIsLoading: (state) => state.isLoading,
    selectError: (state) => state.error,
  },
});

export const {
  fetchAwaitingApprovalDataAsync,
  checkApprovalStatusAsync,
  setAwaitingApprovalData,
  approveJob,
  setLoading,
  setError,
  clearError,
  resetAwaitingApproval,
} = awaitingApprovalSlice.actions;

export const {
  selectJobId,
  selectServiceType,
  selectCustomerName,
  selectAddress,
  selectActualDuration,
  selectEstimatedPrice,
  selectIsApproved,
  selectApprovalTime,
  selectWaitingStartTime,
  selectIsLoading,
  selectError,
} = awaitingApprovalSlice.selectors;

export default awaitingApprovalSlice.reducer;