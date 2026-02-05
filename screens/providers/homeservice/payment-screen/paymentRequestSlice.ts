import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  requestPaymentFromCustomer,
  confirmOnlinePayment,
  confirmCashPayment,
} from '../../../../networks/serviceProviders/paymentNetwork';

export interface PaymentRequestState {
  jobId: string;
  serviceType: string;
  customerName: string;
  serviceCharge: number;
  materialCost: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  paymentRequested: boolean;
  paymentReceived: boolean;
  paymentMethod: 'online' | 'cash' | null;
  transactionId: string | null;
  isProcessing: boolean;
  error: string | null;
}

const initialState: PaymentRequestState = {
  jobId: '',
  serviceType: '',
  customerName: '',
  serviceCharge: 0,
  materialCost: 0,
  additionalCharges: 0,
  discount: 0,
  totalAmount: 0,
  paymentRequested: false,
  paymentReceived: false,
  paymentMethod: null,
  transactionId: null,
  isProcessing: false,
  error: null,
};

const paymentRequestSlice = createAppSlice({
  name: 'paymentRequest',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    requestPaymentAsync: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        try {
          const state = getState() as { paymentRequest: PaymentRequestState };
          const { jobId, totalAmount } = state.paymentRequest;

          if (!jobId) {
            return rejectWithValue('No job ID provided.');
          }

          const response = await requestPaymentFromCustomer(jobId, totalAmount);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to request payment.');
          }
          return response.data.requestId;
        } catch (error) {
          return rejectWithValue('Failed to request payment.');
        }
      },
      {
        pending: (state) => {
          state.isProcessing = true;
          state.paymentRequested = true;
          state.error = null;
        },
        fulfilled: (state) => {
          state.isProcessing = false;
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.paymentRequested = false;
          state.error = action.payload as string;
        },
      }
    ),

    receiveOnlinePaymentAsync: create.asyncThunk(
      async (transactionId: string, { getState, rejectWithValue }) => {
        try {
          const state = getState() as { paymentRequest: PaymentRequestState };
          const { jobId } = state.paymentRequest;

          if (!jobId) {
            return rejectWithValue('No job ID provided.');
          }

          const response = await confirmOnlinePayment(jobId, transactionId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to confirm payment.');
          }
          return transactionId;
        } catch (error) {
          return rejectWithValue('Failed to confirm payment.');
        }
      },
      {
        pending: (state) => {
          state.isProcessing = true;
        },
        fulfilled: (state, action) => {
          state.isProcessing = false;
          state.paymentReceived = true;
          state.paymentMethod = 'online';
          state.transactionId = action.payload;
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.error = action.payload as string;
        },
      }
    ),

    receiveCashPaymentAsync: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        try {
          const state = getState() as { paymentRequest: PaymentRequestState };
          const { jobId } = state.paymentRequest;

          if (!jobId) {
            return rejectWithValue('No job ID provided.');
          }

          const response = await confirmCashPayment(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to confirm cash payment.');
          }
          return response.data.transactionId;
        } catch (error) {
          return rejectWithValue('Failed to confirm cash payment.');
        }
      },
      {
        pending: (state) => {
          state.isProcessing = true;
        },
        fulfilled: (state, action) => {
          state.isProcessing = false;
          state.paymentReceived = true;
          state.paymentMethod = 'cash';
          state.transactionId = action.payload;
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setPaymentRequestData: create.reducer(
      (
        state,
        action: PayloadAction<{
          jobId: string;
          serviceType: string;
          customerName: string;
          serviceCharge: number;
        }>
      ) => {
        state.jobId = action.payload.jobId;
        state.serviceType = action.payload.serviceType;
        state.customerName = action.payload.customerName;
        state.serviceCharge = action.payload.serviceCharge;
        state.totalAmount = action.payload.serviceCharge;
        state.paymentRequested = false;
        state.paymentReceived = false;
        state.paymentMethod = null;
        state.transactionId = null;
      }
    ),

    updateCharges: create.reducer(
      (
        state,
        action: PayloadAction<{
          materialCost?: number;
          additionalCharges?: number;
          discount?: number;
        }>
      ) => {
        if (action.payload.materialCost !== undefined) {
          state.materialCost = action.payload.materialCost;
        }
        if (action.payload.additionalCharges !== undefined) {
          state.additionalCharges = action.payload.additionalCharges;
        }
        if (action.payload.discount !== undefined) {
          state.discount = action.payload.discount;
        }
        state.totalAmount =
          state.serviceCharge + state.materialCost + state.additionalCharges - state.discount;
      }
    ),

    requestPayment: create.reducer((state) => {
      state.paymentRequested = true;
      state.isProcessing = true;
    }),

    receiveOnlinePayment: create.reducer((state, action: PayloadAction<string>) => {
      state.paymentReceived = true;
      state.paymentMethod = 'online';
      state.transactionId = action.payload;
      state.isProcessing = false;
    }),

    receiveCashPayment: create.reducer((state) => {
      state.paymentReceived = true;
      state.paymentMethod = 'cash';
      state.transactionId = `CASH-${Date.now()}`;
      state.isProcessing = false;
    }),

    setProcessing: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    }),

    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isProcessing = false;
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),

    resetPaymentRequest: create.reducer(() => initialState),
  }),
  selectors: {
    selectJobId: (state) => state.jobId,
    selectServiceType: (state) => state.serviceType,
    selectCustomerName: (state) => state.customerName,
    selectServiceCharge: (state) => state.serviceCharge,
    selectMaterialCost: (state) => state.materialCost,
    selectAdditionalCharges: (state) => state.additionalCharges,
    selectDiscount: (state) => state.discount,
    selectTotalAmount: (state) => state.totalAmount,
    selectPaymentRequested: (state) => state.paymentRequested,
    selectPaymentReceived: (state) => state.paymentReceived,
    selectPaymentMethod: (state) => state.paymentMethod,
    selectTransactionId: (state) => state.transactionId,
    selectIsProcessing: (state) => state.isProcessing,
    selectError: (state) => state.error,
  },
});

export const {
  requestPaymentAsync,
  receiveOnlinePaymentAsync,
  receiveCashPaymentAsync,
  setPaymentRequestData,
  updateCharges,
  requestPayment,
  receiveOnlinePayment,
  receiveCashPayment,
  setProcessing,
  setError,
  clearError,
  resetPaymentRequest,
} = paymentRequestSlice.actions;

export const {
  selectJobId,
  selectServiceType,
  selectCustomerName,
  selectServiceCharge,
  selectMaterialCost,
  selectAdditionalCharges,
  selectDiscount,
  selectTotalAmount,
  selectPaymentRequested,
  selectPaymentReceived,
  selectPaymentMethod,
  selectTransactionId,
  selectIsProcessing,
  selectError,
} = paymentRequestSlice.selectors;

export default paymentRequestSlice.reducer;