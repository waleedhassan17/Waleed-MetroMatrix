import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { fetchServiceStatus as fetchServiceStatusApi } from '../../../../networks/serviceProviders/serviceStatusNetwork';
import { processPayment } from '../../../../networks/serviceProviders/paymentNetwork';
import { serviceStatusSerializer } from '../../../../serializers/serviceProviders/serviceStatusSerializer';

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

// Helper to map API service status to local format
const mapApiServiceStatusToLocal = (apiData: ReturnType<typeof serviceStatusSerializer>) => {
  const provider: ServiceProviderInfo = {
    id: apiData.provider.id,
    name: apiData.provider.name,
    phone: apiData.provider.phone,
    image: apiData.provider.image,
    service: apiData.serviceDetails.type,
    specialty: '',
    rating: 0,
    reviews: 0,
    experience: '',
    verified: true,
    category: 'electricians' as ServiceProviderInfo['category'],
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
    completedAt: '',
  };

  return { provider, serviceDetails };
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
        return mapApiServiceStatusToLocal(serialized);
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
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    markServiceCompleted: create.asyncThunk(
      async (params: { bookingId: string }) => {
        // Simulate API call for marking service complete
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          completedAt: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        };
      },
      {
        pending: (state) => {
          state.isSubmitting = true;
        },
        fulfilled: (state, action) => {
          state.isSubmitting = false;
          state.serviceStatus = 'completed';
          if (state.serviceDetails) {
            state.serviceDetails.completedAt = action.payload.completedAt;
          }
        },
        rejected: (state, action) => {
          state.isSubmitting = false;
          state.error = action.payload as string;
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