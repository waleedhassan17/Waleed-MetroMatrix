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
/**
 * 'awaiting_cash' — the customer chose cash; nothing has moved yet and the
 * provider confirms receipt. It used to be reported as 'completed', so the
 * screen told the customer "Payment sent … on its way" before any money had
 * changed hands.
 */
export type PaymentStatusType = 'idle' | 'processing' | 'awaiting_cash' | 'completed' | 'failed';
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
      subtitle: 'Pay the provider in person; they confirm it here',
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
      // The amount is the server's bill, always. A route param used to
      // override it, so a screen opened from a stale booking card showed — and
      // tried to charge — whatever figure that card had.
      async (params: { bookingId: string; category: ServiceCategory }, { rejectWithValue }) => {
        const response = await fetchPaymentData(params.bookingId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to initialize payment');
        }
        const serialized = paymentDataSerializer(response.data);
        const mapped = mapApiPaymentToLocal(serialized);
        const raw = response.data as any;
        return {
          ...mapped,
          serverStatus: (raw?.paymentStatus as string) || 'unpaid',
          serverMethod: (raw?.method as string) || null,
        };
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
          // Open on where the payment really stands, so a customer coming back
          // to a job they already paid (or chose cash for) is not offered the
          // money again.
          if (action.payload.serverStatus === 'paid') {
            state.paymentStatus = 'completed';
            state.transaction.method = normalizePaymentMethod(action.payload.serverMethod);
          } else if (action.payload.serverStatus === 'requested' && action.payload.serverMethod === 'cash') {
            state.paymentStatus = 'awaiting_cash';
            state.selectedMethod = 'cash';
            state.transaction.method = 'cash';
          } else if (state.paymentStatus !== 'processing') {
            state.paymentStatus = 'idle';
          }
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
          // 'pending' is the server's answer for cash: nothing has moved yet.
          status: (response.data.status === 'pending' ? 'awaiting_cash' : 'completed') as PaymentStatusType,
          method: params.method,
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
          state.paymentStatus = action.payload.status;
          state.transaction.method = action.payload.method;
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

    // The customer's own "Change amount" field is gone: the provider sets the
    // price and the server charges exactly that. It let a customer pay Rs. 1
    // for a Rs. 2,000 job.

    /** The provider confirmed the cash (room event `payment_received`). */
    markPaymentConfirmed: create.reducer((state) => {
      state.paymentStatus = 'completed';
      state.isProcessing = false;
    }),

    /** Leave the "waiting for cash" state to pay from the wallet instead. */
    reopenPaymentChoice: create.reducer((state) => {
      state.paymentStatus = 'idle';
      state.selectedMethod = null;
      state.transaction.method = null;
    }),

    resetPaymentState: create.reducer((state) => {
      state.recipient = null;
      state.paymentDetails = null;
      state.transaction = initialState.transaction;
      state.selectedMethod = null;
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
  markPaymentConfirmed,
  reopenPaymentChoice,
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

  return paymentState.paymentDetails.originalAmount;
};

export const selectFormattedPaymentAmount = (state: { payment?: PaymentState }) => {
  const amount = selectPaymentAmount(state);
  return `Rs. ${amount.toLocaleString('en-PK')}`;
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