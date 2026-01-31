import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types
export type PaymentMethodType = 'jazzcash' | 'easypaisa' | 'cash' | 'card' | null;
export type PaymentStatusType = 'idle' | 'processing' | 'completed' | 'failed';
export type ServiceCategory = 'electricians' | 'plumbers' | 'ac-repairers';

export interface PaymentRecipient {
  id: string;
  name: string;
  phone: string;
  image: string;
  service: string;
  category: ServiceCategory;
}

export interface PaymentDetails {
  invoiceId: string;
  bookingId: string;
  description: string;
  originalAmount: number;
  customAmount: number | null;
  dueDate: string;
  serviceDate: string;
}

export interface PaymentTransaction {
  transactionId: string | null;
  method: PaymentMethodType;
  amount: number;
  timestamp: string | null;
  receiptUrl: string | null;
}

export interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  enabled: boolean;
}

export interface PaymentState {
  recipient: PaymentRecipient | null;
  paymentDetails: PaymentDetails | null;
  transaction: PaymentTransaction;
  selectedMethod: PaymentMethodType;
  useCustomAmount: boolean;
  paymentStatus: PaymentStatusType;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  paymentMethods: PaymentMethodOption[];
}

// Initial State
const initialState: PaymentState = {
  recipient: null,
  paymentDetails: null,
  transaction: {
    transactionId: null,
    method: null,
    amount: 0,
    timestamp: null,
    receiptUrl: null,
  },
  selectedMethod: null,
  useCustomAmount: false,
  paymentStatus: 'idle',
  isLoading: false,
  isProcessing: false,
  error: null,
  paymentMethods: [
    {
      id: 'jazzcash',
      name: 'JazzCash',
      subtitle: 'Pay with JazzCash Wallet',
      icon: 'phone-portrait-outline',
      color: '#E63946',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      enabled: true,
    },
    {
      id: 'easypaisa',
      name: 'EasyPaisa',
      subtitle: 'Pay with EasyPaisa Wallet',
      icon: 'wallet-outline',
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      enabled: true,
    },
    {
      id: 'card',
      name: 'Card Payment',
      subtitle: 'Credit or Debit Card',
      icon: 'card-outline',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      enabled: true,
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      subtitle: 'Pay in cash to provider',
      icon: 'cash-outline',
      color: '#64748B',
      bgColor: '#F8FAFC',
      borderColor: '#CBD5E1',
      enabled: true,
    },
  ],
};

// Mock data for different categories
const MOCK_RECIPIENTS: Record<ServiceCategory, PaymentRecipient> = {
  electricians: {
    id: 'elec-001',
    name: 'Usman Ali',
    phone: '+92 300 1234567',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    service: 'Electrical Services',
    category: 'electricians',
  },
  plumbers: {
    id: 'plumb-001',
    name: 'Ahmad Raza',
    phone: '+92 300 9876543',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    service: 'Plumbing Services',
    category: 'plumbers',
  },
  'ac-repairers': {
    id: 'ac-001',
    name: 'Bilal Ahmed',
    phone: '+92 300 5551234',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    service: 'AC Repair Services',
    category: 'ac-repairers',
  },
};

const MOCK_PAYMENT_DETAILS: Record<ServiceCategory, Omit<PaymentDetails, 'bookingId'>> = {
  electricians: {
    invoiceId: 'INV-EL-001234',
    description: 'Electrical wiring repair and circuit breaker inspection',
    originalAmount: 4500,
    customAmount: null,
    dueDate: 'Today',
    serviceDate: new Date().toLocaleDateString(),
  },
  plumbers: {
    invoiceId: 'INV-PL-001235',
    description: 'Pipe leak repair and bathroom fixture installation',
    originalAmount: 3200,
    customAmount: null,
    dueDate: 'Today',
    serviceDate: new Date().toLocaleDateString(),
  },
  'ac-repairers': {
    invoiceId: 'INV-AC-001236',
    description: 'AC gas refilling, filter cleaning and cooling optimization',
    originalAmount: 5000,
    customAmount: null,
    dueDate: 'Today',
    serviceDate: new Date().toLocaleDateString(),
  },
};

// Async Thunks
export const initializePayment = createAsyncThunk(
  'payment/initialize',
  async ({
    bookingId,
    category,
    amount,
  }: {
    bookingId: string;
    category: ServiceCategory;
    amount?: number;
  }) => {
    // Simulate API call
    return new Promise<{
      recipient: PaymentRecipient;
      paymentDetails: PaymentDetails;
    }>((resolve) => {
      setTimeout(() => {
        const recipient = MOCK_RECIPIENTS[category];
        const details = MOCK_PAYMENT_DETAILS[category];

        resolve({
          recipient,
          paymentDetails: {
            ...details,
            bookingId,
            originalAmount: amount || details.originalAmount,
          },
        });
      }, 600);
    });
  }
);

export const processPayment = createAsyncThunk(
  'payment/process',
  async ({
    bookingId,
    amount,
    method,
  }: {
    bookingId: string;
    amount: number;
    method: PaymentMethodType;
  }) => {
    // Simulate payment processing
    return new Promise<{
      transactionId: string;
      timestamp: string;
      receiptUrl: string;
      status: 'completed';
    }>((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional payment failure (10% chance)
        if (Math.random() < 0.1) {
          reject(new Error('Payment processing failed. Please try again.'));
          return;
        }

        resolve({
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          receiptUrl: `https://receipts.example.com/r/${bookingId}`,
          status: 'completed',
        });
      }, 2000);
    });
  }
);

export const verifyPayment = createAsyncThunk(
  'payment/verify',
  async ({ transactionId }: { transactionId: string }) => {
    return new Promise<{ verified: boolean }>((resolve) => {
      setTimeout(() => {
        resolve({ verified: true });
      }, 500);
    });
  }
);

// Slice
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setSelectedMethod: (state, action: PayloadAction<PaymentMethodType>) => {
      state.selectedMethod = action.payload;
      state.transaction.method = action.payload;
    },
    setCustomAmount: (state, action: PayloadAction<number | null>) => {
      if (state.paymentDetails) {
        state.paymentDetails.customAmount = action.payload;
        state.transaction.amount = action.payload || state.paymentDetails.originalAmount;
      }
    },
    toggleCustomAmount: (state) => {
      state.useCustomAmount = !state.useCustomAmount;
      if (!state.useCustomAmount && state.paymentDetails) {
        state.paymentDetails.customAmount = null;
        state.transaction.amount = state.paymentDetails.originalAmount;
      }
    },
    resetPaymentState: (state) => {
      state.recipient = null;
      state.paymentDetails = null;
      state.transaction = initialState.transaction;
      state.selectedMethod = null;
      state.useCustomAmount = false;
      state.paymentStatus = 'idle';
      state.error = null;
    },
    clearPaymentError: (state) => {
      state.error = null;
    },
    setPaymentMethodEnabled: (
      state,
      action: PayloadAction<{ methodId: PaymentMethodType; enabled: boolean }>
    ) => {
      const method = state.paymentMethods.find((m) => m.id === action.payload.methodId);
      if (method) {
        method.enabled = action.payload.enabled;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize payment
      .addCase(initializePayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializePayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recipient = action.payload.recipient;
        state.paymentDetails = action.payload.paymentDetails;
        state.transaction.amount = action.payload.paymentDetails.originalAmount;
      })
      .addCase(initializePayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize payment';
      })
      // Process payment
      .addCase(processPayment.pending, (state) => {
        state.isProcessing = true;
        state.paymentStatus = 'processing';
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.paymentStatus = 'completed';
        state.transaction.transactionId = action.payload.transactionId;
        state.transaction.timestamp = action.payload.timestamp;
        state.transaction.receiptUrl = action.payload.receiptUrl;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.paymentStatus = 'failed';
        state.error = action.error.message || 'Payment failed';
      })
      // Verify payment
      .addCase(verifyPayment.fulfilled, (state) => {
        // Payment verified successfully
      });
  },
});

// Actions
export const {
  setSelectedMethod,
  setCustomAmount,
  toggleCustomAmount,
  resetPaymentState,
  clearPaymentError,
  setPaymentMethodEnabled,
} = paymentSlice.actions;

// Selectors
export const selectPaymentAmount = (state: { payment?: PaymentState }) => {
  const paymentState = state.payment;
  if (!paymentState?.paymentDetails) return 0;

  return (
    paymentState.paymentDetails.customAmount || paymentState.paymentDetails.originalAmount
  );
};

export const selectFormattedPaymentAmount = (state: { payment?: PaymentState }) => {
  const amount = selectPaymentAmount(state);
  return `Rs ${amount.toLocaleString()}`;
};

export const selectIsPaymentValid = (state: { payment?: PaymentState }) => {
  const paymentState = state.payment;
  if (!paymentState) return false;

  const hasMethod = paymentState.selectedMethod !== null;
  const hasValidAmount = selectPaymentAmount(state) > 0;
  const notProcessing = !paymentState.isProcessing;

  return hasMethod && hasValidAmount && notProcessing;
};

export const selectPaymentSummaryData = (state: { payment?: PaymentState }) => {
  const paymentState = state.payment;
  if (!paymentState?.recipient || !paymentState?.paymentDetails) return null;

  return {
    recipient: paymentState.recipient,
    details: paymentState.paymentDetails,
    amount: selectPaymentAmount(state),
    formattedAmount: selectFormattedPaymentAmount(state),
    method: paymentState.selectedMethod,
    methodName:
      paymentState.paymentMethods.find((m) => m.id === paymentState.selectedMethod)?.name ||
      null,
  };
};

export const selectEnabledPaymentMethods = (state: { payment?: PaymentState }) => {
  return state.payment?.paymentMethods.filter((m) => m.enabled) || [];
};

export default paymentSlice.reducer;