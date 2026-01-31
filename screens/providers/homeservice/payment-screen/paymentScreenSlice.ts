import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // Initialize payment for a job
    initializePayment: (state, action: PayloadAction<PaymentDetails>) => {
      state.currentPayment = action.payload;
      state.paymentRequested = false;
      state.paymentReceived = false;
      state.paymentMethod = null;
      state.transactionId = null;
      state.error = null;
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
      
      // Add to history
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

    // Mark as paid in cash
    receiveCashPayment: (state) => {
      state.paymentReceived = true;
      state.paymentMethod = 'cash';
      state.transactionId = `CASH-${Date.now()}`;
      state.isProcessing = false;
      
      // Add to history
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
    },

    // Update payment amount (for additional charges)
    updatePaymentAmount: (state, action: PayloadAction<{
      additionalCharges?: number;
      materialCost?: number;
      discount?: number;
    }>) => {
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
        
        // Recalculate total
        const breakdown = state.currentPayment.breakdown;
        state.currentPayment.amount = 
          breakdown.serviceCharge +
          (breakdown.materialCost || 0) +
          (breakdown.additionalCharges || 0) +
          (breakdown.tax || 0) -
          (breakdown.discount || 0);
      }
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

    // Clear current payment
    clearPayment: (state) => {
      state.currentPayment = null;
      state.paymentRequested = false;
      state.paymentReceived = false;
      state.paymentMethod = null;
      state.transactionId = null;
      state.isProcessing = false;
      state.error = null;
    },

    // Load payment history
    loadPaymentHistory: (state, action: PayloadAction<PaymentRecord[]>) => {
      state.paymentHistory = action.payload;
    },
  },
});

export const {
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

export default paymentSlice.reducer;