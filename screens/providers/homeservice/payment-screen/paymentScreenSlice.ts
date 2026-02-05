import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  initializeProviderPayment,
  requestPaymentFromCustomer,
  confirmOnlinePayment,
  confirmCashPayment,
} from '../../../../networks/serviceProviders/paymentNetwork';

export interface PaymentDetails {
  jobId: string;
  amount: number;
  serviceType: string;
  customerName: string;
  breakdown: {
    serviceCharge: number;
    materialCost?: number;
    additionalCharges?: number;
    discount?: number;
    tax?: number;
  };
}

export interface PaymentState {
  currentPayment: PaymentDetails | null;
  paymentRequested: boolean;
  paymentReceived: boolean;
  paymentMethod: 'online' | 'cash' | null;
  transactionId: string | null;
  isProcessing: boolean;
  error: string | null;
  paymentHistory: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  jobId: string;
  amount: number;
  method: 'online' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  customerName: string;
  serviceType: string;
}

const initialState: PaymentState = {
  currentPayment: null,
  paymentRequested: false,
  paymentReceived: false,
  paymentMethod: null,
  transactionId: null,
  isProcessing: false,
  error: null,
  paymentHistory: [],
};

const paymentSlice = createAppSlice({
  name: 'payment',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    initializePaymentAsync: create.asyncThunk(
      async (jobId: string, { rejectWithValue }) => {
        try {
          const response = await initializeProviderPayment(jobId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to initialize payment.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to initialize payment.');
        }
      },
      {
        pending: (state) => {
          state.isProcessing = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isProcessing = false;
          state.currentPayment = {
            jobId: action.payload.jobId,
            amount: action.payload.amount,
            serviceType: action.payload.serviceType,
            customerName: action.payload.customerName,
            breakdown: action.payload.breakdown,
          };
          state.paymentRequested = false;
          state.paymentReceived = false;
          state.paymentMethod = null;
          state.transactionId = null;
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.error = action.payload as string;
        },
      }
    ),

    requestPaymentAsync: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        try {
          const state = getState() as { payment: PaymentState };
          const { currentPayment } = state.payment;
          
          if (!currentPayment) {
            return rejectWithValue('No payment to request.');
          }

          const response = await requestPaymentFromCustomer(
            currentPayment.jobId,
            currentPayment.amount
          );
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
          const state = getState() as { payment: PaymentState };
          const { currentPayment } = state.payment;

          if (!currentPayment) {
            return rejectWithValue('No payment to confirm.');
          }

          const response = await confirmOnlinePayment(currentPayment.jobId, transactionId);
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
          
          if (state.currentPayment) {
            state.paymentHistory.unshift({
              id: action.payload,
              jobId: state.currentPayment.jobId,
              amount: state.currentPayment.amount,
              method: 'online',
              status: 'completed',
              timestamp: new Date().toISOString(),
              customerName: state.currentPayment.customerName,
              serviceType: state.currentPayment.serviceType,
            });
          }
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
          const state = getState() as { payment: PaymentState };
          const { currentPayment } = state.payment;

          if (!currentPayment) {
            return rejectWithValue('No payment to confirm.');
          }

          const response = await confirmCashPayment(currentPayment.jobId);
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
          
          if (state.currentPayment) {
            state.paymentHistory.unshift({
              id: action.payload,
              jobId: state.currentPayment.jobId,
              amount: state.currentPayment.amount,
              method: 'cash',
              status: 'completed',
              timestamp: new Date().toISOString(),
              customerName: state.currentPayment.customerName,
              serviceType: state.currentPayment.serviceType,
            });
          }
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    initializePayment: create.reducer((state, action: PayloadAction<PaymentDetails>) => {
      state.currentPayment = action.payload;
      state.paymentRequested = false;
      state.paymentReceived = false;
      state.paymentMethod = null;
      state.transactionId = null;
      state.error = null;
    }),

    requestPayment: create.reducer((state) => {
      state.paymentRequested = true;
      state.isProcessing = true;
    }),

    receiveOnlinePayment: create.reducer((state, action: PayloadAction<string>) => {
      state.paymentReceived = true;
      state.paymentMethod = 'online';
      state.transactionId = action.payload;
      state.isProcessing = false;
      
      if (state.currentPayment) {
        state.paymentHistory.unshift({
          id: action.payload,
          jobId: state.currentPayment.jobId,
          amount: state.currentPayment.amount,
          method: 'online',
          status: 'completed',
          timestamp: new Date().toISOString(),
          customerName: state.currentPayment.customerName,
          serviceType: state.currentPayment.serviceType,
        });
      }
    }),

    receiveCashPayment: create.reducer((state) => {
      state.paymentReceived = true;
      state.paymentMethod = 'cash';
      state.transactionId = `CASH-${Date.now()}`;
      state.isProcessing = false;
      
      if (state.currentPayment) {
        state.paymentHistory.unshift({
          id: state.transactionId,
          jobId: state.currentPayment.jobId,
          amount: state.currentPayment.amount,
          method: 'cash',
          status: 'completed',
          timestamp: new Date().toISOString(),
          customerName: state.currentPayment.customerName,
          serviceType: state.currentPayment.serviceType,
        });
      }
    }),

    updatePaymentAmount: create.reducer(
      (
        state,
        action: PayloadAction<{
          additionalCharges?: number;
          materialCost?: number;
          discount?: number;
        }>
      ) => {
        if (state.currentPayment) {
          const { additionalCharges, materialCost, discount } = action.payload;
          
          if (additionalCharges !== undefined) {
            state.currentPayment.breakdown.additionalCharges = additionalCharges;
          }
          if (materialCost !== undefined) {
            state.currentPayment.breakdown.materialCost = materialCost;
          }
          if (discount !== undefined) {
            state.currentPayment.breakdown.discount = discount;
          }
          
          const breakdown = state.currentPayment.breakdown;
          state.currentPayment.amount =
            breakdown.serviceCharge +
            (breakdown.materialCost || 0) +
            (breakdown.additionalCharges || 0) +
            (breakdown.tax || 0) -
            (breakdown.discount || 0);
        }
      }
    ),

    setProcessing: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    }),

    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isProcessing = false;
    }),

    clearPayment: create.reducer((state) => {
      state.currentPayment = null;
      state.paymentRequested = false;
      state.paymentReceived = false;
      state.paymentMethod = null;
      state.transactionId = null;
      state.isProcessing = false;
      state.error = null;
    }),

    loadPaymentHistory: create.reducer((state, action: PayloadAction<PaymentRecord[]>) => {
      state.paymentHistory = action.payload;
    }),
  }),
  selectors: {
    selectCurrentPayment: (state) => state.currentPayment,
    selectPaymentRequested: (state) => state.paymentRequested,
    selectPaymentReceived: (state) => state.paymentReceived,
    selectPaymentMethod: (state) => state.paymentMethod,
    selectTransactionId: (state) => state.transactionId,
    selectIsProcessing: (state) => state.isProcessing,
    selectPaymentError: (state) => state.error,
    selectPaymentHistory: (state) => state.paymentHistory,
  },
});

export const {
  initializePaymentAsync,
  requestPaymentAsync,
  receiveOnlinePaymentAsync,
  receiveCashPaymentAsync,
  initializePayment,
  requestPayment,
  receiveOnlinePayment,
  receiveCashPayment,
  updatePaymentAmount,
  setProcessing,
  setError,
  clearPayment,
  loadPaymentHistory,
} = paymentSlice.actions;

export const {
  selectCurrentPayment,
  selectPaymentRequested,
  selectPaymentReceived,
  selectPaymentMethod,
  selectTransactionId,
  selectIsProcessing,
  selectPaymentError,
  selectPaymentHistory,
} = paymentSlice.selectors;

export default paymentSlice.reducer;