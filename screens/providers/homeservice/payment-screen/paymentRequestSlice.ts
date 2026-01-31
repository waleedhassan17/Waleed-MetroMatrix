import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const paymentRequestSlice = createSlice({
  name: 'paymentRequest',
  initialState,
  reducers: {
    // Set payment request data from awaiting approval
    setPaymentRequestData: (state, action: PayloadAction<{
      jobId: string;
      serviceType: string;
      customerName: string;
      serviceCharge: number;
    }>) => {
      state.jobId = action.payload.jobId;
      state.serviceType = action.payload.serviceType;
      state.customerName = action.payload.customerName;
      state.serviceCharge = action.payload.serviceCharge;
      state.totalAmount = action.payload.serviceCharge;
      state.paymentRequested = false;
      state.paymentReceived = false;
      state.paymentMethod = null;
      state.transactionId = null;
    },

    // Update charges
    updateCharges: (state, action: PayloadAction<{
      materialCost?: number;
      additionalCharges?: number;
      discount?: number;
    }>) => {
      if (action.payload.materialCost !== undefined) {
        state.materialCost = action.payload.materialCost;
      }
      if (action.payload.additionalCharges !== undefined) {
        state.additionalCharges = action.payload.additionalCharges;
      }
      if (action.payload.discount !== undefined) {
        state.discount = action.payload.discount;
      }
      // Recalculate total
      state.totalAmount = 
        state.serviceCharge + 
        state.materialCost + 
        state.additionalCharges - 
        state.discount;
    },

    // Request payment from customer
    requestPayment: (state) => {
      state.paymentRequested = true;
      state.isProcessing = true;
    },

    // Payment received online
    receiveOnlinePayment: (state, action: PayloadAction<string>) => {
      state.paymentReceived = true;
      state.paymentMethod = 'online';
      state.transactionId = action.payload;
      state.isProcessing = false;
    },

    // Cash payment received
    receiveCashPayment: (state) => {
      state.paymentReceived = true;
      state.paymentMethod = 'cash';
      state.transactionId = `CASH-${Date.now()}`;
      state.isProcessing = false;
    },

    // Set processing state
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isProcessing = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset payment request state
    resetPaymentRequest: () => initialState,
  },
});

export const {
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

export default paymentRequestSlice.reducer;
