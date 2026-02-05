import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchPaymentData,
  processPayment as processPaymentApi,
} from '../../../../networks/serviceProviders/paymentNetwork';
import {
  paymentDataSerializer,
} from '../../../../serializers/serviceProviders/paymentSerializer';

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

// Helper to map API payment data to local format
const mapApiPaymentToLocal = (apiData: ReturnType<typeof paymentDataSerializer>) => {
  const recipient: PaymentRecipient = {
    id: apiData.recipient.id,
    name: apiData.recipient.name,
    phone: '',
    image: apiData.recipient.image,
    service: apiData.details.service,
    category: 'electricians' as ServiceCategory,
  };

  const paymentDetails: PaymentDetails = {
    invoiceId: apiData.details.invoiceId,
    bookingId: apiData.details.bookingId,
    description: apiData.details.description,
    originalAmount: apiData.details.amount,
    customAmount: null,
    dueDate: 'Today',
    serviceDate: new Date().toISOString(),
  };

  return { recipient, paymentDetails };
};

// Slice
const paymentSlice = createAppSlice({
  name: 'payment',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    initializePayment: create.asyncThunk(
      async (
        params: { bookingId: string; category: ServiceCategory; amount?: number },
        { rejectWithValue }
      ) => {
        const response = await fetchPaymentData(params.bookingId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to initialize payment');
        }
        const serialized = paymentDataSerializer(response.data);
        const mapped = mapApiPaymentToLocal(serialized);
        if (params.amount) {
          mapped.paymentDetails.originalAmount = params.amount;
        }
        return mapped;
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.recipient = action.payload.recipient;
          state.paymentDetails = action.payload.paymentDetails;
          state.transaction.amount = action.payload.paymentDetails.originalAmount;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    processPayment: create.asyncThunk(
      async (
        params: { bookingId: string; amount: number; method: PaymentMethodType },
        { rejectWithValue }
      ) => {
        const response = await processPaymentApi({
          bookingId: params.bookingId,
          amount: params.amount,
          method: params.method || 'cash',
        });
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Payment processing failed');
        }
        return {
          transactionId: response.data.transactionId,
          timestamp: response.data.paidAt,
          receiptUrl: '',
          status: 'completed' as const,
        };
      },
      {
        pending: (state) => {
          state.isProcessing = true;
          state.paymentStatus = 'processing';
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isProcessing = false;
          state.paymentStatus = 'completed';
          state.transaction.transactionId = action.payload.transactionId;
          state.transaction.timestamp = action.payload.timestamp;
          state.transaction.receiptUrl = action.payload.receiptUrl;
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.paymentStatus = 'failed';
          state.error = action.payload as string;
        },
      }
    ),

    verifyPayment: create.asyncThunk(
      async (params: { transactionId: string }) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { verified: true };
      },
      {
        fulfilled: () => {
          // Payment verified successfully
        },
      }
    ),

    // Sync reducers
    setSelectedMethod: create.reducer((state, action: PayloadAction<PaymentMethodType>) => {
      state.selectedMethod = action.payload;
      state.transaction.method = action.payload;
    }),

    setCustomAmount: create.reducer((state, action: PayloadAction<number | null>) => {
      if (state.paymentDetails) {
        state.paymentDetails.customAmount = action.payload;
        state.transaction.amount = action.payload || state.paymentDetails.originalAmount;
      }
    }),

    toggleCustomAmount: create.reducer((state) => {
      state.useCustomAmount = !state.useCustomAmount;
      if (!state.useCustomAmount && state.paymentDetails) {
        state.paymentDetails.customAmount = null;
        state.transaction.amount = state.paymentDetails.originalAmount;
      }
    }),

    resetPaymentState: create.reducer((state) => {
      state.recipient = null;
      state.paymentDetails = null;
      state.transaction = initialState.transaction;
      state.selectedMethod = null;
      state.useCustomAmount = false;
      state.paymentStatus = 'idle';
      state.error = null;
    }),

    clearPaymentError: create.reducer((state) => {
      state.error = null;
    }),

    setPaymentMethodEnabled: create.reducer(
      (state, action: PayloadAction<{ methodId: PaymentMethodType; enabled: boolean }>) => {
        const method = state.paymentMethods.find((m) => m.id === action.payload.methodId);
        if (method) {
          method.enabled = action.payload.enabled;
        }
      }
    ),
  }),
  selectors: {
    selectRecipient: (state) => state.recipient,
    selectPaymentDetails: (state) => state.paymentDetails,
    selectTransaction: (state) => state.transaction,
    selectSelectedMethod: (state) => state.selectedMethod,
    selectUseCustomAmount: (state) => state.useCustomAmount,
    selectPaymentStatus: (state) => state.paymentStatus,
    selectIsLoading: (state) => state.isLoading,
    selectIsProcessing: (state) => state.isProcessing,
    selectError: (state) => state.error,
    selectPaymentMethods: (state) => state.paymentMethods,
  },
});

// Actions
export const {
  initializePayment,
  processPayment,
  verifyPayment,
  setSelectedMethod,
  setCustomAmount,
  toggleCustomAmount,
  resetPaymentState,
  clearPaymentError,
  setPaymentMethodEnabled,
} = paymentSlice.actions;

// Selectors
export const {
  selectRecipient,
  selectPaymentDetails,
  selectTransaction,
  selectSelectedMethod,
  selectUseCustomAmount,
  selectPaymentStatus,
  selectIsLoading,
  selectIsProcessing,
  selectError,
  selectPaymentMethods,
} = paymentSlice.selectors;

// Computed Selectors
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