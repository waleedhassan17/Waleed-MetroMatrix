import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Define local state type for selectors to avoid circular dependency
type BookConfirmationRootState = { bookConfirmation: BookConfirmationState };

// Types
export type BookingStatusType = 
  | 'waiting' 
  | 'accepted' 
  | 'declined' 
  | 'timeout' 
  | 'cancelled';

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  icon: 'home' | 'building' | 'location' | 'briefcase';
  isDefault: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ProviderInfo {
  id: string;
  name: string;
  image: string;
  service: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: string;
  verified: boolean;
  isOnline: boolean;
  responseTime: string;
  basePrice: number;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
}

export interface BookingDetails {
  providerId: string;
  providerName: string;
  service: string;
  selectedDate: string;
  selectedTime: string;
  selectedAddress: SavedAddress | null;
  instructions: string;
  estimatedPrice: number;
  estimatedDuration: string;
}

export interface BookingConfirmation {
  bookingId: string;
  status: BookingStatusType;
  createdAt: string;
  updatedAt: string;
  providerResponseTime?: number; // in seconds
  estimatedArrival?: string;
}

export interface BookConfirmationState {
  // Provider Info
  provider: ProviderInfo | null;
  
  // Booking Details (from previous screen)
  bookingDetails: BookingDetails | null;
  
  // Confirmation Status
  bookingConfirmation: BookingConfirmation | null;
  
  // UI State
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  
  // Timer State
  waitingStartTime: string | null;
  maxWaitTime: number; // in seconds
  
  // Notification State
  notificationSent: boolean;
  notificationSentAt: string | null;
}

// Initial State
const initialState: BookConfirmationState = {
  provider: null,
  bookingDetails: null,
  bookingConfirmation: null,
  isLoading: false,
  isProcessing: false,
  error: null,
  waitingStartTime: null,
  maxWaitTime: 300, // 5 minutes
  notificationSent: false,
  notificationSentAt: null,
};

// Mock Provider Data
const MOCK_PROVIDERS: Record<string, ProviderInfo> = {
  electricians: {
    id: 'elec-001',
    name: 'Usman Ali',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    service: 'Electrical Services',
    specialty: 'Wiring & Installation Specialist',
    rating: 4.8,
    reviews: 189,
    experience: '10+ years',
    verified: true,
    isOnline: true,
    responseTime: '~15 min',
    basePrice: 3000,
    category: 'electricians',
  },
  plumbers: {
    id: 'plumb-001',
    name: 'Ahmad Raza',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    service: 'Plumbing Services',
    specialty: 'Pipe Fitting & Leak Repairs',
    rating: 4.9,
    reviews: 245,
    experience: '8+ years',
    verified: true,
    isOnline: true,
    responseTime: '~10 min',
    basePrice: 2500,
    category: 'plumbers',
  },
  'ac-repairers': {
    id: 'ac-001',
    name: 'Bilal Ahmed',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    service: 'AC Repair Services',
    specialty: 'AC Installation & Cooling Expert',
    rating: 4.7,
    reviews: 167,
    experience: '6+ years',
    verified: true,
    isOnline: true,
    responseTime: '~20 min',
    basePrice: 3500,
    category: 'ac-repairers',
  },
};

// Async Thunks

/**
 * Initialize the confirmation screen with booking data
 */
export const initializeConfirmation = createAsyncThunk(
  'bookConfirmation/initialize',
  async (params: { 
    category: 'electricians' | 'plumbers' | 'ac-repairers';
    bookingDetails?: BookingDetails;
  }) => {
    // Simulate API call to get provider and send notification
    return new Promise<{
      provider: ProviderInfo;
      bookingId: string;
      notificationSentAt: string;
    }>((resolve) => {
      setTimeout(() => {
        const provider = MOCK_PROVIDERS[params.category] || MOCK_PROVIDERS['ac-repairers'];
        resolve({
          provider,
          bookingId: `BK-${Date.now().toString(36).toUpperCase()}`,
          notificationSentAt: new Date().toISOString(),
        });
      }, 500);
    });
  }
);

/**
 * Cancel the booking request
 */
export const cancelBookingRequest = createAsyncThunk(
  'bookConfirmation/cancelRequest',
  async (bookingId: string) => {
    // Simulate API call to cancel booking
    return new Promise<{ success: boolean; cancelledAt: string }>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          cancelledAt: new Date().toISOString(),
        });
      }, 500);
    });
  }
);

/**
 * Retry booking with the same or different provider
 */
export const retryBooking = createAsyncThunk(
  'bookConfirmation/retry',
  async (params: {
    providerId: string;
    bookingDetails: BookingDetails;
  }) => {
    // Simulate API call to retry booking
    return new Promise<{
      bookingId: string;
      notificationSentAt: string;
    }>((resolve) => {
      setTimeout(() => {
        resolve({
          bookingId: `BK-${Date.now().toString(36).toUpperCase()}`,
          notificationSentAt: new Date().toISOString(),
        });
      }, 500);
    });
  }
);

/**
 * Check booking status (polling)
 */
export const checkBookingStatus = createAsyncThunk(
  'bookConfirmation/checkStatus',
  async (bookingId: string) => {
    // Simulate API call to check status
    return new Promise<{
      status: BookingStatusType;
      updatedAt: string;
      estimatedArrival?: string;
    }>((resolve) => {
      setTimeout(() => {
        // This would normally come from the server
        // For now, we'll just return waiting
        resolve({
          status: 'waiting',
          updatedAt: new Date().toISOString(),
        });
      }, 300);
    });
  }
);

// Slice
const bookConfirmationSlice = createSlice({
  name: 'bookConfirmation',
  initialState,
  reducers: {
    /**
     * Set the booking status manually (for simulated provider response)
     */
    setBookingStatus: (state, action: PayloadAction<BookingStatusType>) => {
      // Create bookingConfirmation if it doesn't exist
      if (!state.bookingConfirmation) {
        state.bookingConfirmation = {
          bookingId: `BK-${Date.now().toString(36).toUpperCase()}`,
          status: action.payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        state.bookingConfirmation.status = action.payload;
        state.bookingConfirmation.updatedAt = new Date().toISOString();
      }
      
      // If accepted, set estimated arrival
      if (action.payload === 'accepted') {
        const arrivalTime = new Date();
        arrivalTime.setMinutes(arrivalTime.getMinutes() + 30);
        state.bookingConfirmation.estimatedArrival = arrivalTime.toISOString();
      }
    },

    /**
     * Cancel booking (synchronous)
     */
    cancelBooking: (state) => {
      if (state.bookingConfirmation) {
        state.bookingConfirmation.status = 'cancelled';
        state.bookingConfirmation.updatedAt = new Date().toISOString();
      }
    },

    /**
     * Set provider info
     */
    setProvider: (state, action: PayloadAction<ProviderInfo>) => {
      state.provider = action.payload;
    },

    /**
     * Set booking details (from BookingScreen)
     */
    setBookingDetails: (state, action: PayloadAction<BookingDetails>) => {
      state.bookingDetails = action.payload;
    },

    /**
     * Update waiting start time
     */
    setWaitingStartTime: (state) => {
      state.waitingStartTime = new Date().toISOString();
    },

    /**
     * Reset the confirmation state
     */
    resetConfirmation: (state) => {
      return {
        ...initialState,
        // Keep provider and booking details for retry
        provider: state.provider,
        bookingDetails: state.bookingDetails,
      };
    },

    /**
     * Clear all state
     */
    clearConfirmationState: () => {
      return initialState;
    },

    /**
     * Set error
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize Confirmation
      .addCase(initializeConfirmation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeConfirmation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload.provider;
        state.bookingConfirmation = {
          bookingId: action.payload.bookingId,
          status: 'waiting',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.notificationSent = true;
        state.notificationSentAt = action.payload.notificationSentAt;
        state.waitingStartTime = new Date().toISOString();
      })
      .addCase(initializeConfirmation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize confirmation';
      })

      // Cancel Booking Request
      .addCase(cancelBookingRequest.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(cancelBookingRequest.fulfilled, (state) => {
        state.isProcessing = false;
        if (state.bookingConfirmation) {
          state.bookingConfirmation.status = 'cancelled';
          state.bookingConfirmation.updatedAt = new Date().toISOString();
        }
      })
      .addCase(cancelBookingRequest.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.error.message || 'Failed to cancel booking';
      })

      // Retry Booking
      .addCase(retryBooking.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(retryBooking.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.bookingConfirmation = {
          bookingId: action.payload.bookingId,
          status: 'waiting',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.notificationSent = true;
        state.notificationSentAt = action.payload.notificationSentAt;
        state.waitingStartTime = new Date().toISOString();
      })
      .addCase(retryBooking.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.error.message || 'Failed to retry booking';
      })

      // Check Booking Status
      .addCase(checkBookingStatus.fulfilled, (state, action) => {
        if (state.bookingConfirmation) {
          state.bookingConfirmation.status = action.payload.status;
          state.bookingConfirmation.updatedAt = action.payload.updatedAt;
          if (action.payload.estimatedArrival) {
            state.bookingConfirmation.estimatedArrival = action.payload.estimatedArrival;
          }
        }
      });
  },
});

// Actions
export const {
  setBookingStatus,
  cancelBooking,
  setProvider,
  setBookingDetails,
  setWaitingStartTime,
  resetConfirmation,
  clearConfirmationState,
  setError,
} = bookConfirmationSlice.actions;

// Selectors

/**
 * Select the booking confirmation state
 */
export const selectBookingConfirmation = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.bookingConfirmation;

/**
 * Select the provider info
 */
export const selectConfirmationProvider = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.provider;

/**
 * Select booking details
 */
export const selectConfirmationDetails = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.bookingDetails;

/**
 * Select loading state
 */
export const selectIsLoading = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.isLoading;

/**
 * Select processing state
 */
export const selectIsProcessing = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.isProcessing;

/**
 * Select error state
 */
export const selectError = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.error;

/**
 * Select if notification was sent
 */
export const selectNotificationSent = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.notificationSent;

/**
 * Select waiting start time
 */
export const selectWaitingStartTime = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.waitingStartTime;

/**
 * Select max wait time
 */
export const selectMaxWaitTime = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.maxWaitTime;

/**
 * Select booking status
 */
export const selectBookingStatus = (state: BookConfirmationRootState): BookingStatusType => 
  state.bookConfirmation?.bookingConfirmation?.status || 'waiting';

/**
 * Select if booking is in final state
 */
export const selectIsBookingFinalized = (state: BookConfirmationRootState): boolean => {
  const status = state.bookConfirmation?.bookingConfirmation?.status;
  return status === 'accepted' || status === 'declined' || status === 'cancelled' || status === 'timeout';
};

/**
 * Select booking ID
 */
export const selectBookingId = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.bookingConfirmation?.bookingId;

/**
 * Select estimated arrival time
 */
export const selectEstimatedArrival = (state: BookConfirmationRootState) => 
  state.bookConfirmation?.bookingConfirmation?.estimatedArrival;

/**
 * Compute time elapsed since waiting started
 */
export const selectTimeElapsed = (state: BookConfirmationRootState): number => {
  const startTime = state.bookConfirmation?.waitingStartTime;
  if (!startTime) return 0;
  
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
};

/**
 * Compute time remaining
 */
export const selectTimeRemaining = (state: BookConfirmationRootState): number => {
  const maxWait = state.bookConfirmation?.maxWaitTime || 300;
  const startTime = state.bookConfirmation?.waitingStartTime;
  
  if (!startTime) return maxWait;
  
  const elapsed = selectTimeElapsed(state);
  return Math.max(0, maxWait - elapsed);
};

export default bookConfirmationSlice.reducer;