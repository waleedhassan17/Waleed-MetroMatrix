import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchBookingDetail } from '../../../../networks/serviceProviders/adminHomeServiceApi';
import {
  createBooking,
  cancelBooking as cancelBookingApi,
} from '../../../../networks/serviceProviders/bookingNetwork';

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

// ============================================================================
// Every thunk below talks to the real backend.
//
// This slice used to simulate the whole flow: it invented a provider from a
// MOCK_PROVIDERS table and minted a `BK-<timestamp>` booking id. That fake id
// then flowed into tracking, service status and chat, where it became
// `GET /bookings/default/tracking` and 404'd. There is no local booking id —
// only the one POST /bookings returns.
// ============================================================================

// The server's confirmation vocabulary -> this screen's status vocabulary.
// 'timeout' is intentionally absent: it is a client-side wait-expiry state and
// the server never reports it.
const toScreenStatus = (apiStatus?: string): BookingStatusType => {
  switch (apiStatus) {
    case 'confirmed':
      return 'accepted';
    case 'rejected':
      return 'declined';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'waiting';
  }
};

// The booking payload carries the provider under the shared BookingProvider
// shape, which already matches ProviderInfo field for field.
const toProviderInfo = (raw: any): ProviderInfo | null => {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    name: raw.name || '',
    image: raw.image || '',
    service: raw.service || '',
    specialty: raw.specialty || '',
    rating: raw.rating || 0,
    reviews: raw.reviews || 0,
    experience: raw.experience || '',
    verified: !!raw.verified,
    isOnline: !!raw.isOnline,
    responseTime: raw.responseTime || '',
    basePrice: raw.basePrice || 0,
    category: raw.category || 'ac-repairers',
  };
};

// Async Thunks

/**
 * Seed the confirmation screen for an EXISTING booking.
 *
 * `bookingId` is required — it comes from POST /bookings via the booking
 * screen. When the caller already has the provider and details from that same
 * response, they are used as-is; otherwise we read them back with
 * GET /bookings/:id, which the backend documents as this screen's read path.
 */
export const initializeConfirmation = createAsyncThunk(
  'bookConfirmation/initialize',
  async (
    params: {
      bookingId: string;
      provider?: ProviderInfo | null;
      bookingDetails?: BookingDetails | null;
    },
    { rejectWithValue }
  ) => {
    const { bookingId } = params;
    if (!bookingId) {
      return rejectWithValue('Missing booking id.');
    }

    // Seeded from the create response — no round trip needed.
    if (params.provider && params.bookingDetails) {
      return {
        bookingId,
        provider: params.provider,
        bookingDetails: params.bookingDetails,
        status: 'waiting' as BookingStatusType,
        notificationSentAt: new Date().toISOString(),
        estimatedArrival: undefined as string | undefined,
      };
    }

    const response = await fetchBookingDetail(bookingId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || 'Failed to load your booking.');
    }

    const data = response.data;
    return {
      bookingId: String(data.bookingId || data.id || bookingId),
      // A provider assignment may still be pending — that is a legitimate
      // 'waiting' state, not a reason to invent someone.
      provider: toProviderInfo(data.provider),
      bookingDetails: (data.bookingDetails as BookingDetails) || null,
      status: toScreenStatus(data.status),
      notificationSentAt: new Date().toISOString(),
      estimatedArrival: data.estimatedArrival as string | undefined,
    };
  }
);

/**
 * Cancel the pending booking request.
 */
export const cancelBookingRequest = createAsyncThunk(
  'bookConfirmation/cancelRequest',
  async (bookingId: string, { rejectWithValue }) => {
    if (!bookingId) return rejectWithValue('Missing booking id.');

    const response = await cancelBookingApi(bookingId, 'Cancelled by customer');
    if (!response.success) {
      return rejectWithValue(response.message || 'Failed to cancel booking.');
    }
    return { success: true, cancelledAt: new Date().toISOString() };
  }
);

/**
 * Retry by creating a NEW booking. The id this returns is a real one from the
 * server — the screen must adopt it, because the previous booking is gone.
 */
export const retryBooking = createAsyncThunk(
  'bookConfirmation/retry',
  async (
    params: {
      providerId: string;
      bookingDetails: BookingDetails;
    },
    { rejectWithValue }
  ) => {
    const { providerId, bookingDetails } = params;
    const response = await createBooking({
      providerId,
      selectedDate: bookingDetails.selectedDate,
      selectedTime: bookingDetails.selectedTime,
      addressId: bookingDetails.selectedAddress?.id || '',
      instructions: bookingDetails.instructions,
    });

    if (!response.success || !response.data || !response.data.bookingId) {
      return rejectWithValue(response.message || 'Failed to retry booking.');
    }

    return {
      bookingId: String(response.data.bookingId),
      provider: toProviderInfo(response.data.provider),
      bookingDetails: (response.data.bookingDetails as unknown as BookingDetails) || bookingDetails,
      notificationSentAt: new Date().toISOString(),
    };
  }
);

/**
 * Poll the live status of a booking. Backs up the socket subscription so the
 * screen still advances if the realtime service is unreachable.
 */
export const checkBookingStatus = createAsyncThunk(
  'bookConfirmation/checkStatus',
  async (bookingId: string, { rejectWithValue }) => {
    if (!bookingId) return rejectWithValue('Missing booking id.');

    const response = await fetchBookingDetail(bookingId);
    if (!response.success || !response.data) {
      return rejectWithValue(response.message || 'Failed to check booking status.');
    }

    return {
      status: toScreenStatus(response.data.status),
      provider: toProviderInfo(response.data.provider),
      updatedAt: new Date().toISOString(),
      estimatedArrival: response.data.estimatedArrival as string | undefined,
    };
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
      // No booking, no status. This used to mint a `BK-<timestamp>` id here,
      // which is how a screen with no real booking still rendered a
      // confirmation — and then 404'd on every follow-up request.
      if (!state.bookingConfirmation) {
        if (__DEV__) {
          console.warn(
            '[bookConfirmation] setBookingStatus ignored — no booking in state yet.'
          );
        }
        return;
      }

      state.bookingConfirmation.status = action.payload;
      state.bookingConfirmation.updatedAt = new Date().toISOString();

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
        state.bookingDetails = action.payload.bookingDetails;
        state.bookingConfirmation = {
          bookingId: action.payload.bookingId,
          status: action.payload.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          estimatedArrival: action.payload.estimatedArrival,
        };
        state.notificationSent = true;
        state.notificationSentAt = action.payload.notificationSentAt;
        state.waitingStartTime = new Date().toISOString();
      })
      .addCase(initializeConfirmation.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ||
          action.error.message ||
          'Failed to initialize confirmation';
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
        state.error =
          (action.payload as string) || action.error.message || 'Failed to cancel booking';
      })

      // Retry Booking
      .addCase(retryBooking.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(retryBooking.fulfilled, (state, action) => {
        state.isProcessing = false;
        // A retry is a NEW booking — adopt its id and provider wholesale.
        state.bookingConfirmation = {
          bookingId: action.payload.bookingId,
          status: 'waiting',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (action.payload.provider) state.provider = action.payload.provider;
        state.bookingDetails = action.payload.bookingDetails;
        state.notificationSent = true;
        state.notificationSentAt = action.payload.notificationSentAt;
        state.waitingStartTime = new Date().toISOString();
      })
      .addCase(retryBooking.rejected, (state, action) => {
        state.isProcessing = false;
        state.error =
          (action.payload as string) || action.error.message || 'Failed to retry booking';
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
        // The provider is assigned server-side after the booking is placed, so
        // a poll is often where we first learn who it is.
        if (action.payload.provider) {
          state.provider = action.payload.provider;
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