import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const awaitingApprovalSlice = createSlice({
  name: 'awaitingApproval',
  initialState,
  reducers: {
    // Set awaiting approval data
    setAwaitingApprovalData: (state, action: PayloadAction<{
      jobId: string;
      serviceType: string;
      customerName: string;
      address: string;
      actualDuration: number | null;
      estimatedPrice: number;
    }>) => {
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

    // Customer approves the job
    approveJob: (state) => {
      state.isApproved = true;
      state.approvalTime = new Date().toISOString();
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

    // Reset awaiting approval state
    resetAwaitingApproval: () => initialState,
  },
});

export const {
  setAwaitingApprovalData,
  approveJob,
  setLoading,
  setError,
  clearError,
  resetAwaitingApproval,
} = awaitingApprovalSlice.actions;

export default awaitingApprovalSlice.reducer;