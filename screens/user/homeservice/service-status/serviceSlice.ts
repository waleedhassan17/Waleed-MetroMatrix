import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchServiceStatus as fetchServiceStatusApi,
  completeBookingByCustomer,
} from '../../../../networks/serviceProviders/serviceStatusNetwork';
import { processPayment } from '../../../../networks/serviceProviders/paymentNetwork';
import { serviceStatusSerializer } from '../../../../serializers/serviceProviders/serviceStatusSerializer';
import { formatInstant } from '../../../../utils/date/localDate';

// Types
export interface ServiceProviderInfo {
  id: string;
  name: string;
  phone: string;
  image: string;
  service: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: string;
  verified: boolean;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
  startTime: string;
}

export interface ServiceDetails {
  bookingId: string;
  invoiceId: string;
  description: string;
  estimatedDuration: string;
  suggestedAmount: number;
  serviceDate: string;
  startedAt: string;
  completedAt: string | null;
}

export interface PaymentInfo {
  amount: number;
  method: 'cash' | 'jazzcash' | 'easypaisa' | 'card' | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId: string | null;
}

export type ServiceStatusType = 
  | 'in_progress' 
  | 'checking' 
  | 'completed' 
  | 'payment_pending' 
  | 'payment_completed';

export interface ServiceStatusState {
  provider: ServiceProviderInfo | null;
  serviceDetails: ServiceDetails | null;
  payment: PaymentInfo;
  serviceStatus: ServiceStatusType;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

// Initial State
const initialState: ServiceStatusState = {
  provider: null,
  serviceDetails: null,
  payment: {
    amount: 0,
    method: null,
    status: 'pending',
    transactionId: null,
  },
  serviceStatus: 'checking',
  isLoading: false,
  isSubmitting: false,
  error: null,
};

/**
 * Server truth → this screen's vocabulary.
 *
 * The backend's canonical status maps to 'arrived'|'in_progress'|'completed';
 * this screen additionally distinguishes paid from unpaid, which the backend
 * carries as the parallel payment.status field rather than as a status.
 *
 * Payment wins when settled: a booking that is COMPLETED and paid is
 * 'payment_completed', so the payment card and the leave-without-paying guard
 * both switch off from server state alone.
 */
const mapApiStatusToLocal = (
  apiStatus: ReturnType<typeof serviceStatusSerializer>['status'],
  paymentStatus: ReturnType<typeof serviceStatusSerializer>['payment']['status']
): ServiceStatusType => {
  if (apiStatus === 'completed') {
    return paymentStatus === 'paid' ? 'payment_completed' : 'completed';
  }
  if (apiStatus === 'in_progress') return 'in_progress';
  return 'checking'; // 'arrived' — work has not started yet
};

// Helper to map API service status to local format
const mapApiServiceStatusToLocal = (
  apiData: ReturnType<typeof serviceStatusSerializer>,
  category: ServiceProviderInfo['category']
) => {
  const provider: ServiceProviderInfo = {
    id: apiData.provider.id,
    name: apiData.provider.name,
    phone: apiData.provider.phone,
    image: apiData.provider.image,
    service: apiData.serviceDetails.type,
    // Straight from the API now. Empty/0 is meaningful — the card hides the
    // corresponding badge rather than showing "★ 0" or a blank pill.
    specialty: apiData.provider.specialty,
    rating: apiData.provider.rating,
    reviews: apiData.provider.reviews,
    experience: apiData.provider.experience,
    verified: apiData.provider.verified,
    // Was hardcoded to 'electricians', so a plumbing or AC job rendered the
    // electrician theme. The screen already knows which vertical it is.
    category,
    startTime: apiData.serviceDetails.startedAt,
  };

  const serviceDetails: ServiceDetails = {
    bookingId: apiData.bookingId,
    invoiceId: '',
    description: apiData.serviceDetails.description,
    estimatedDuration: apiData.serviceDetails.estimatedDuration,
    suggestedAmount: apiData.serviceDetails.suggestedAmount,
    serviceDate: apiData.serviceDetails.startedAt,
    startedAt: apiData.serviceDetails.startedAt,
    // The backend stamps the completion time on the timeline step; reuse it
    // rather than inventing a client-side clock value. Formatted here, from the
    // instant, so it agrees with every other time on the screen — `time` is the
    // server's Karachi-pinned string, kept as a fallback for an API that has
    // not shipped `timeAt` yet.
    completedAt: (() => {
      const step = apiData.progressSteps.find((s) => s.label === 'Completed' && s.completed);
      if (!step) return '';
      return formatInstant(step.timeAt) || step.time || '';
    })(),
  };

  const payment: PaymentInfo = {
    // The server tracks an amount owed; a customer-entered amount is layered on
    // top of it by setPaymentAmount, so seed from the server rather than 0.
    amount: apiData.payment.amount || apiData.serviceDetails.suggestedAmount || 0,
    method: null,
    status: apiData.payment.status === 'paid' ? 'completed' : 'pending',
    transactionId: null,
  };

  return {
    provider,
    serviceDetails,
    payment,
    serviceStatus: mapApiStatusToLocal(apiData.status, apiData.payment.status),
  };
};

// Slice
const serviceStatusSlice = createAppSlice({
  name: 'serviceStatus',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchServiceStatus: create.asyncThunk(
      async (
        params: { bookingId: string; category: 'electricians' | 'plumbers' | 'ac-repairers' },
        { rejectWithValue }
      ) => {
        const response = await fetchServiceStatusApi(params.bookingId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch service status');
        }
        const serialized = serviceStatusSerializer(response.data);
        return mapApiServiceStatusToLocal(serialized, params.category);
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload.provider;
          state.serviceDetails = action.payload.serviceDetails;
          // Adopting the SERVER's status and payment here is the whole point of
          // the fetch. This handler previously wrote only provider and
          // serviceDetails, so serviceStatus stayed pinned at 'checking' no
          // matter what the backend said — which is why a fake local thunk was
          // the only thing that ever advanced this screen, and why a
          // completed-but-unpaid booking looked unpaid-and-unfinished forever.
          state.serviceStatus = action.payload.serviceStatus;
          state.payment.status = action.payload.payment.status;
          // Don't clobber an amount the customer is mid-way through typing.
          if (!state.payment.amount) {
            state.payment.amount = action.payload.payment.amount;
          }
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // The customer confirms the job is done. This is a real transition on the
    // server: review submission and payment both refuse a booking that is not
    // COMPLETED, so faking it locally (as this thunk once did, with a 500ms
    // setTimeout) left every downstream step 400-ing.
    markServiceCompleted: create.asyncThunk(
      async (params: { bookingId: string }, { rejectWithValue }) => {
        const response = await completeBookingByCustomer(params.bookingId);
        if (!response.success) {
          return rejectWithValue(response.message || 'Could not mark the service as completed');
        }
        return true;
      },
      {
        pending: (state) => {
          state.isSubmitting = true;
          state.error = null;
        },
        // Status advances ONLY here, on a confirmed server response. The caller
        // refetches straight after, which fills in completedAt and payment from
        // the server; this flip just avoids a frame of stale UI in between.
        fulfilled: (state) => {
          state.isSubmitting = false;
          state.serviceStatus = 'completed';
        },
        // Deliberately does NOT touch serviceStatus: a failed call must leave
        // the screen where it was, showing an error, not a false 'completed'.
        rejected: (state, action) => {
          state.isSubmitting = false;
          state.error = (action.payload as string) || 'Could not mark the service as completed';
        },
      }
    ),

    submitPayment: create.asyncThunk(
      async (
        params: { bookingId: string; amount: number; method: 'cash' | 'jazzcash' | 'easypaisa' | 'card' },
        { rejectWithValue }
      ) => {
        const response = await processPayment({
          bookingId: params.bookingId,
          amount: params.amount,
          method: params.method,
        });
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Payment failed');
        }
        return {
          transactionId: response.data.transactionId,
          status: 'completed' as const,
        };
      },
      {
        pending: (state) => {
          state.isSubmitting = true;
          state.payment.status = 'processing';
        },
        fulfilled: (state, action) => {
          state.isSubmitting = false;
          state.payment.status = 'completed';
          state.payment.transactionId = action.payload.transactionId;
          state.serviceStatus = 'payment_completed';
        },
        rejected: (state, action) => {
          state.isSubmitting = false;
          state.payment.status = 'failed';
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setPaymentAmount: create.reducer((state, action: PayloadAction<number>) => {
      state.payment.amount = action.payload;
    }),

    setPaymentMethod: create.reducer(
      (state, action: PayloadAction<'cash' | 'jazzcash' | 'easypaisa' | 'card' | null>) => {
        state.payment.method = action.payload;
      }
    ),

    setServiceStatus: create.reducer((state, action: PayloadAction<ServiceStatusType>) => {
      state.serviceStatus = action.payload;
    }),

    clearServiceStatusState: create.reducer((state) => {
      state.provider = null;
      state.serviceDetails = null;
      state.payment = initialState.payment;
      state.serviceStatus = 'checking';
      state.error = null;
    }),

    resetPayment: create.reducer((state) => {
      state.payment = initialState.payment;
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectServiceDetails: (state) => state.serviceDetails,
    selectPayment: (state) => state.payment,
    selectServiceStatusValue: (state) => state.serviceStatus,
    selectIsLoading: (state) => state.isLoading,
    selectIsSubmitting: (state) => state.isSubmitting,
    selectError: (state) => state.error,
  },
});

// Actions
export const {
  fetchServiceStatus,
  markServiceCompleted,
  submitPayment,
  setPaymentAmount,
  setPaymentMethod,
  setServiceStatus,
  clearServiceStatusState,
  resetPayment,
} = serviceStatusSlice.actions;

// Selectors
export const {
  selectProvider,
  selectServiceDetails,
  selectPayment,
  selectServiceStatusValue,
  selectIsLoading,
  selectIsSubmitting,
  selectError,
} = serviceStatusSlice.selectors;

// Computed Selectors
export const selectIsPaymentReady = (state: { serviceStatus?: ServiceStatusState }) => {
  const serviceStatusState = state.serviceStatus;
  if (!serviceStatusState) return false;
  const { payment, serviceStatus } = serviceStatusState;
  return serviceStatus === 'completed' && payment.amount > 0;
};

export const selectPaymentSummary = (state: { serviceStatus?: ServiceStatusState }) => {
  const serviceStatusState = state.serviceStatus;
  if (!serviceStatusState) return null;
  const { provider, serviceDetails, payment } = serviceStatusState;
  
  if (!provider || !serviceDetails) return null;
  
  return {
    providerName: provider.name,
    providerPhone: provider.phone,
    service: provider.service,
    invoiceId: serviceDetails.invoiceId,
    description: serviceDetails.description,
    amount: payment.amount,
    formattedAmount: `Rs ${payment.amount.toLocaleString()}`,
    suggestedAmount: serviceDetails.suggestedAmount,
    formattedSuggestedAmount: `Rs ${serviceDetails.suggestedAmount.toLocaleString()}`,
  };
};

interface ProgressStep {
  key: string;
  label: string;
  completed: boolean;
}

export const selectServiceProgress = (state: { serviceStatus?: ServiceStatusState }): ProgressStep[] => {
  const serviceStatusState = state.serviceStatus;
  if (!serviceStatusState) return [];
  const { serviceStatus } = serviceStatusState;
  
  const steps: ProgressStep[] = [
    { key: 'started', label: 'Service Started', completed: true },
    { key: 'in_progress', label: 'In Progress', completed: serviceStatus !== 'checking' },
    { key: 'completed', label: 'Completed', completed: ['completed', 'payment_pending', 'payment_completed'].includes(serviceStatus) },
    { key: 'payment', label: 'Payment', completed: serviceStatus === 'payment_completed' },
  ];
  
  return steps;
};

export default serviceStatusSlice.reducer;