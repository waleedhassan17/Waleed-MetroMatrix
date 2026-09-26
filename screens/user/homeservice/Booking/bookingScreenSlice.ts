import { PayloadAction, createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchBookingData as fetchBookingDataApi,
  fetchActiveBookings as fetchActiveBookingsApi,
  createBooking,
} from '../../../../networks/serviceProviders/bookingNetwork';
import {
  activeBookingSerializer,
  bookingDataSerializer,
} from '../../../../serializers/serviceProviders/bookingSerializer';
import type {
  ActiveBooking,
  BookingProvider,
  BookingDetails as ApiBookingDetails,
} from '../../../../models/serviceProviders/booking';

// Types
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

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  period: 'morning' | 'afternoon' | 'evening';
  /** Why it cannot be booked, when it cannot: the server's own words. */
  reason?: 'day_off' | 'outside_hours' | 'past' | 'too_soon' | 'booked';
  reasonLabel?: string;
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

// What submitBooking rejects with when the provider already has this
// customer's request. A plain string would have made the screen show "You
// already have a request with Usman Tariq" as an error, which is not an error
// — it is a signal to open the request that exists.
export interface DuplicateBookingError {
  duplicate: true;
  message: string;
  activeBooking: ActiveBooking | null;
}

export interface BookingState {
  provider: ProviderInfo | null;
  savedAddresses: SavedAddress[];
  timeSlots: TimeSlot[];
  selectedDate: string;
  selectedTime: string;
  selectedAddress: SavedAddress | null;
  instructions: string;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // ── Live requests, keyed by provider id ──────────────────────────────────
  //
  // A customer may run several bookings at once — with DIFFERENT providers.
  // The same provider twice over is the thing that must not happen: it gave
  // the provider two rows for one job and reset the customer's wait each time
  // they tapped Book again.
  //
  // Held here, in the booking slice, rather than copied into the provider list
  // and the provider profile separately: both screens need the same answer,
  // and two copies of it drift.
  activeBookings: Record<string, ActiveBooking>;
  // The live request with the provider whose booking form is currently open,
  // straight from GET /bookings/init/:providerId. The screen redirects to it.
  activeBookingForProvider: ActiveBooking | null;

  // Mirrors the POST /bookings response so the confirmation screen can be
  // seeded from it directly. `status` uses the server's confirmation
  // vocabulary — a new booking starts as 'waiting', not 'confirmed'.
  bookingConfirmation: {
    bookingId: string;
    status: 'waiting' | 'confirmed' | 'rejected' | 'cancelled';
    provider: BookingProvider | null;
    bookingDetails: ApiBookingDetails | null;
    estimatedArrival?: string;
  } | null;
}

// Initial State
const initialState: BookingState = {
  provider: null,
  savedAddresses: [],
  timeSlots: [],
  selectedDate: '',
  selectedTime: '',
  selectedAddress: null,
  instructions: '',
  isLoading: false,
  isSubmitting: false,
  error: null,
  activeBookings: {},
  activeBookingForProvider: null,
  bookingConfirmation: null,
};

// Helper to map API data to local format
const mapApiBookingDataToLocal = (apiData: ReturnType<typeof bookingDataSerializer>) => {
  const provider: ProviderInfo = {
    id: apiData.provider.id,
    name: apiData.provider.name,
    image: apiData.provider.image,
    service: apiData.provider.service,
    specialty: apiData.provider.specialty || '',
    rating: apiData.provider.rating,
    reviews: apiData.provider.reviews,
    experience: apiData.provider.experience,
    verified: apiData.provider.verified,
    isOnline: apiData.provider.isOnline,
    responseTime: apiData.provider.responseTime,
    basePrice: apiData.provider.basePrice,
    category: apiData.provider.category as ProviderInfo['category'],
  };

  const addresses: SavedAddress[] = apiData.addresses.map((addr) => ({
    id: addr.id,
    label: addr.label,
    address: addr.address,
    icon: addr.icon as SavedAddress['icon'],
    isDefault: addr.isDefault,
    coordinates: addr.coordinates,
  }));

  const timeSlots: TimeSlot[] = apiData.timeSlots.map((slot, index) => ({
    id: slot.id || `slot-${index}`,
    time: slot.time,
    available: slot.available,
    period: slot.period as TimeSlot['period'],
    reason: (slot as any).reason,
    reasonLabel: (slot as any).reasonLabel,
  }));

  return { provider, addresses, timeSlots };
};

// Slice
const bookingSlice = createAppSlice({
  name: 'booking',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchBookingData: create.asyncThunk(
      async (
        params: {
          providerId: string;
          category: 'electricians' | 'plumbers' | 'ac-repairers';
          // 'YYYY-MM-DD'. Passed once a date is picked so the server can mark
          // this provider's already-booked slots on that date unavailable.
          date?: string;
        },
        { rejectWithValue }
      ) => {
        const response = await fetchBookingDataApi(params.providerId, params.date);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch booking data');
        }
        const serialized = bookingDataSerializer(response.data);
        return {
          ...mapApiBookingDataToLocal(serialized),
          activeBooking: serialized.activeBooking,
        };
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
          // Whose request this describes is about to change. Left standing, it
          // would redirect the form for provider B to provider A's booking for
          // as long as the fetch takes.
          state.activeBookingForProvider = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload.provider;
          state.savedAddresses = action.payload.addresses;
          state.timeSlots = action.payload.timeSlots;
          // A date change re-fetches slots for that date; if the time the
          // customer already had selected is booked (by them, for a
          // different date, or by someone else) on THIS date, it will not be
          // in the fresh list as available — drop it rather than leave a
          // selection standing that the form would reject on submit.
          if (
            state.selectedTime &&
            !state.timeSlots.some((slot) => slot.time === state.selectedTime && slot.available)
          ) {
            state.selectedTime = '';
          }
          state.activeBookingForProvider = action.payload.activeBooking;
          if (action.payload.activeBooking) {
            state.activeBookings[action.payload.activeBooking.providerId] =
              action.payload.activeBooking;
          }
          const defaultAddr = action.payload.addresses.find((addr) => addr.isDefault);
          if (defaultAddr) {
            state.selectedAddress = defaultAddr;
          }
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Every live request this customer holds, so the Book buttons on the
    // provider list and the provider profile know which providers already have
    // one. Fetched on focus by both screens; a failure is silent, and the
    // buttons simply behave as they did before — the create guard on the
    // server is what actually prevents the duplicate.
    fetchActiveBookings: create.asyncThunk(
      async (_: void, { rejectWithValue }) => {
        const response = await fetchActiveBookingsApi();
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch active bookings');
        }
        return response.data.bookings || [];
      },
      {
        fulfilled: (state, action) => {
          state.activeBookings = action.payload.reduce<Record<string, ActiveBooking>>(
            (acc, booking) => {
              if (booking.providerId) acc[booking.providerId] = booking;
              return acc;
            },
            {}
          );
        },
      }
    ),

    submitBooking: create.asyncThunk(
      async (bookingDetails: BookingDetails, { rejectWithValue }) => {
        const response = await createBooking({
          providerId: bookingDetails.providerId,
          selectedDate: bookingDetails.selectedDate,
          selectedTime: bookingDetails.selectedTime,
          addressId: bookingDetails.selectedAddress?.id || '',
          instructions: bookingDetails.instructions,
        });
        // 409: this provider already has a live request from this customer.
        // The server hands back the booking that exists, so the screen can
        // open it instead of asking the customer to fill the form in again.
        if (!response.success && response.data && (response.data as any).activeBooking) {
          return rejectWithValue({
            duplicate: true,
            message: response.message || 'You already have a request with this provider.',
            activeBooking: activeBookingSerializer((response.data as any).activeBooking),
          } as DuplicateBookingError);
        }
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to submit booking');
        }
        if (!response.data.bookingId) {
          // Never let a booking without a server id reach the confirmation
          // screen — everything downstream (tracking, service status, chat)
          // keys off this id, and a missing one used to become the literal
          // string 'default' and 404.
          return rejectWithValue('Booking was created without an id. Please try again.');
        }
        // POST /bookings already returns the assigned provider and the
        // normalised booking details alongside the id. Carrying them through
        // means the confirmation screen needs no second round trip — and no
        // fabricated stand-ins.
        return {
          bookingId: response.data.bookingId,
          status: response.data.status ?? ('waiting' as const),
          provider: response.data.provider ?? null,
          bookingDetails: response.data.bookingDetails ?? null,
          estimatedArrival: response.data.estimatedArrival,
        };
      },
      {
        pending: (state) => {
          state.isSubmitting = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isSubmitting = false;
          state.bookingConfirmation = {
            bookingId: action.payload.bookingId,
            status: action.payload.status,
            provider: action.payload.provider,
            bookingDetails: action.payload.bookingDetails,
            estimatedArrival: action.payload.estimatedArrival,
          };
        },
        rejected: (state, action) => {
          state.isSubmitting = false;
          const payload = action.payload as string | DuplicateBookingError;
          // A duplicate is not a failed booking — the customer has one. Record
          // it so the buttons update, and leave `error` clear: the screen
          // navigates to the existing request rather than showing a message.
          if (payload && typeof payload === 'object' && payload.duplicate) {
            if (payload.activeBooking) {
              state.activeBookingForProvider = payload.activeBooking;
              state.activeBookings[payload.activeBooking.providerId] = payload.activeBooking;
            }
            state.error = null;
            return;
          }
          state.error = payload as string;
        },
      }
    ),

    // `addNewAddress` used to live here. It never called the API — it slept
    // 500ms and returned `addr-${Date.now()}`, an id the server has never seen,
    // which `createBooking` would then post as `addressId` and get a 400 for.
    // Nothing dispatched it: the booking screen sends people to
    // AddressManagement, which uses the real `addUserAddress` endpoint.

    // Sync reducers
    setSelectedDate: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    }),

    setSelectedTime: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedTime = action.payload;
    }),

    setSelectedAddress: create.reducer((state, action: PayloadAction<SavedAddress | null>) => {
      state.selectedAddress = action.payload;
    }),

    setInstructions: create.reducer((state, action: PayloadAction<string>) => {
      state.instructions = action.payload;
    }),

    clearBookingState: create.reducer((state) => {
      state.selectedDate = '';
      state.selectedTime = '';
      state.selectedAddress = null;
      state.instructions = '';
      state.bookingConfirmation = null;
      state.activeBookingForProvider = null;
      state.error = null;
    }),

    setDefaultAddress: create.reducer((state) => {
      const defaultAddr = state.savedAddresses.find((addr) => addr.isDefault);
      if (defaultAddr) {
        state.selectedAddress = defaultAddr;
      }
    }),

    updateAddressDefault: create.reducer((state, action: PayloadAction<string>) => {
      state.savedAddresses = state.savedAddresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === action.payload,
      }));
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectSavedAddresses: (state) => state.savedAddresses,
    selectTimeSlots: (state) => state.timeSlots,
    selectSelectedDate: (state) => state.selectedDate,
    selectSelectedTime: (state) => state.selectedTime,
    selectSelectedAddress: (state) => state.selectedAddress,
    selectInstructions: (state) => state.instructions,
    selectIsLoading: (state) => state.isLoading,
    selectIsSubmitting: (state) => state.isSubmitting,
    selectError: (state) => state.error,
    selectBookingConfirmation: (state) => state.bookingConfirmation,
    selectActiveBookings: (state) => state.activeBookings,
    selectActiveBookingForProvider: (state) => state.activeBookingForProvider,
  },
});

// Actions
export const {
  fetchBookingData,
  fetchActiveBookings,
  submitBooking,
  setSelectedDate,
  setSelectedTime,
  setSelectedAddress,
  setInstructions,
  clearBookingState,
  setDefaultAddress,
  updateAddressDefault,
} = bookingSlice.actions;

// Selectors
export const {
  selectActiveBookings,
  selectActiveBookingForProvider,
  selectProvider,
  selectSavedAddresses,
  selectTimeSlots,
  selectSelectedDate,
  selectSelectedTime,
  selectSelectedAddress,
  selectInstructions,
  selectIsLoading,
  selectIsSubmitting,
  selectError,
  selectBookingConfirmation,
} = bookingSlice.selectors;

// Computed Selectors
export const selectIsFormValid = (state: { booking: BookingState }) => {
  const { selectedDate, selectedTime, selectedAddress } = state.booking;
  return Boolean(selectedDate && selectedTime && selectedAddress);
};

// Memoized selectors
const selectBookingProvider = (state: { booking: BookingState }) => state.booking.provider;
const selectBookingDate = (state: { booking: BookingState }) => state.booking.selectedDate;
const selectBookingTime = (state: { booking: BookingState }) => state.booking.selectedTime;
const selectBookingAddress = (state: { booking: BookingState }) => state.booking.selectedAddress;
const selectBookingInstructions = (state: { booking: BookingState }) => state.booking.instructions;

export const selectBookingSummary = createSelector(
  [selectBookingProvider, selectBookingDate, selectBookingTime, selectBookingAddress, selectBookingInstructions],
  (provider, selectedDate, selectedTime, selectedAddress, instructions): BookingDetails | null => {
    if (!provider) return null;

    return {
      providerId: provider.id,
      providerName: provider.name,
      service: provider.service,
      selectedDate,
      selectedTime,
      selectedAddress,
      instructions,
      estimatedPrice: provider.basePrice,
      estimatedDuration: '1-2 hours',
    };
  }
);

export default bookingSlice.reducer;