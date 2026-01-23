import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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

// Mock data by category
const MOCK_PROVIDERS: Record<string, ServiceProviderInfo> = {
  electricians: {
    id: 'elec-001',
    name: 'Usman Ali',
    phone: '+923001234567',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    service: 'Electrical Services',
    specialty: 'Wiring & Installation Specialist',
    rating: 4.8,
    reviews: 189,
    experience: '10+ years',
    verified: true,
    category: 'electricians',
    startTime: '10:30 AM',
  },
  plumbers: {
    id: 'plumb-001',
    name: 'Ahmad Raza',
    phone: '+923009876543',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    service: 'Plumbing Services',
    specialty: 'Pipe Fitting & Leak Repairs',
    rating: 4.9,
    reviews: 245,
    experience: '8+ years',
    verified: true,
    category: 'plumbers',
    startTime: '11:00 AM',
  },
  'ac-repairers': {
    id: 'ac-001',
    name: 'Bilal Ahmed',
    phone: '+923005551234',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    service: 'AC Repair Services',
    specialty: 'AC Installation & Cooling Expert',
    rating: 4.7,
    reviews: 167,
    experience: '6+ years',
    verified: true,
    category: 'ac-repairers',
    startTime: '09:45 AM',
  },
};

const MOCK_SERVICE_DETAILS: Record<string, Omit<ServiceDetails, 'bookingId'>> = {
  electricians: {
    invoiceId: 'INV-EL-001234',
    description: 'Electrical wiring repair and circuit breaker inspection',
    estimatedDuration: '2-3 hours',
    suggestedAmount: 4500,
    serviceDate: 'Today',
    startedAt: '10:30 AM',
    completedAt: null,
  },
  plumbers: {
    invoiceId: 'INV-PL-001235',
    description: 'Pipe leak repair and bathroom fixture installation',
    estimatedDuration: '1-2 hours',
    suggestedAmount: 3200,
    serviceDate: 'Today',
    startedAt: '11:00 AM',
    completedAt: null,
  },
  'ac-repairers': {
    invoiceId: 'INV-AC-001236',
    description: 'AC gas refilling, filter cleaning and cooling optimization',
    estimatedDuration: '1-2 hours',
    suggestedAmount: 5000,
    serviceDate: 'Today',
    startedAt: '09:45 AM',
    completedAt: null,
  },
};

// Async Thunks
export const fetchServiceStatus = createAsyncThunk(
  'serviceStatus/fetchStatus',
  async ({ 
    bookingId, 
    category 
  }: { 
    bookingId: string; 
    category: 'electricians' | 'plumbers' | 'ac-repairers';
  }) => {
    // Simulate API call
    return new Promise<{
      provider: ServiceProviderInfo;
      serviceDetails: ServiceDetails;
    }>((resolve) => {
      setTimeout(() => {
        const provider = MOCK_PROVIDERS[category] || MOCK_PROVIDERS['ac-repairers'];
        const details = MOCK_SERVICE_DETAILS[category] || MOCK_SERVICE_DETAILS['ac-repairers'];
        
        resolve({
          provider,
          serviceDetails: {
            ...details,
            bookingId,
          },
        });
      }, 800);
    });
  }
);

export const markServiceCompleted = createAsyncThunk(
  'serviceStatus/markCompleted',
  async ({ bookingId }: { bookingId: string }) => {
    // Simulate API call
    return new Promise<{ completedAt: string }>((resolve) => {
      setTimeout(() => {
        resolve({
          completedAt: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        });
      }, 500);
    });
  }
);

export const submitPayment = createAsyncThunk(
  'serviceStatus/submitPayment',
  async ({ 
    bookingId, 
    amount, 
    method 
  }: { 
    bookingId: string; 
    amount: number; 
    method: 'cash' | 'jazzcash' | 'easypaisa' | 'card';
  }) => {
    // Simulate API call
    return new Promise<{ 
      transactionId: string; 
      status: 'completed' 
    }>((resolve) => {
      setTimeout(() => {
        resolve({
          transactionId: `TXN-${Date.now()}`,
          status: 'completed',
        });
      }, 1500);
    });
  }
);

// Slice
const serviceStatusSlice = createSlice({
  name: 'serviceStatus',
  initialState,
  reducers: {
    setPaymentAmount: (state, action: PayloadAction<number>) => {
      state.payment.amount = action.payload;
    },
    setPaymentMethod: (state, action: PayloadAction<'cash' | 'jazzcash' | 'easypaisa' | 'card' | null>) => {
      state.payment.method = action.payload;
    },
    setServiceStatus: (state, action: PayloadAction<ServiceStatusType>) => {
      state.serviceStatus = action.payload;
    },
    clearServiceStatusState: (state) => {
      state.provider = null;
      state.serviceDetails = null;
      state.payment = initialState.payment;
      state.serviceStatus = 'checking';
      state.error = null;
    },
    resetPayment: (state) => {
      state.payment = initialState.payment;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch service status
      .addCase(fetchServiceStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServiceStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload.provider;
        state.serviceDetails = action.payload.serviceDetails;
      })
      .addCase(fetchServiceStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch service status';
      })
      // Mark service completed
      .addCase(markServiceCompleted.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(markServiceCompleted.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.serviceStatus = 'completed';
        if (state.serviceDetails) {
          state.serviceDetails.completedAt = action.payload.completedAt;
        }
      })
      .addCase(markServiceCompleted.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to mark service as completed';
      })
      // Submit payment
      .addCase(submitPayment.pending, (state) => {
        state.isSubmitting = true;
        state.payment.status = 'processing';
      })
      .addCase(submitPayment.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.payment.status = 'completed';
        state.payment.transactionId = action.payload.transactionId;
        state.serviceStatus = 'payment_completed';
      })
      .addCase(submitPayment.rejected, (state, action) => {
        state.isSubmitting = false;
        state.payment.status = 'failed';
        state.error = action.error.message || 'Payment failed';
      });
  },
});

// Actions
export const {
  setPaymentAmount,
  setPaymentMethod,
  setServiceStatus,
  clearServiceStatusState,
  resetPayment,
} = serviceStatusSlice.actions;

// Selectors - use type assertion for RootState compatibility
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