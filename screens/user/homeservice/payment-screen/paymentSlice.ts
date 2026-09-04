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
// Home services settles through the MetroMatrix wallet or cash on completion.
//
// 'jazzcash' | 'easypaisa' | 'card' used to be listed here as separate methods,
// but none of them were real: the backend routed jazzcash and easypaisa
// straight to payWithWallet() — the same in-app wallet under two other brands'
// names — and card was never implemented at all. Offering four options where
// two of them silently did the same thing and one did nothing is worse than
// offering the two that are true.
//
// The legacy ids stay accepted when READING an old booking's payment record
// (see normalizePaymentMethod) so historical rows still render.
export type PaymentMethodType = 'wallet' | 'cash' | null;

/** Old rows and older app builds still carry the retired ids. */
export type LegacyPaymentMethodType = 'jazzcash' | 'easypaisa' | 'card';

/** Map any historical method id onto one of the two real ones. */
export const normalizePaymentMethod = (
  method?: string | null
): PaymentMethodType => {
  if (!method) return null;
  if (method === 'cash') return 'cash';
  // Everything else that ever existed was the wallet wearing a different name.
  return 'wallet';
};
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
}

/**
 * A payment method as the screen renders it.
 *
 * The three colour literals that used to live here (color / bgColor /
 * borderColor) are gone: presentation belongs in the screen, which reads it
 * from the shared tokens. A slice deciding what shade of green a button is was
 * how #059669 ended up defined in four unrelated places.
 */
export interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  subtitle: string;
  icon: string;
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
  },
  selectedMethod: null,
  useCustomAmount: false,
  paymentStatus: 'idle',
  isLoading: false,
  isProcessing: false,
  error: null,
  paymentMethods: [
    {
      id: 'wallet',
      name: 'MetroMatrix Wallet',
      subtitle: 'Pay instantly from your wallet balance',
      icon: 'wallet-outline',
      enabled: true,
    },
    {
      id: 'cash',
      name: 'Cash',
      subtitle: 'Pay the provider in cash on completion',
      icon: 'cash-outline',
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
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.paymentStatus = 'failed';
          state.error = action.payload as string;
        },
      }
    ),

    // `verifyPayment` used to sit here: it slept 500ms and returned
    // `{ verified: true }` without asking anything. Nothing dispatched it, and
    // had anything done so it would have rubber-stamped a failed payment. The
    // real verification is POST /payments/process itself, whose response is the
    // server's word on whether the money moved.

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