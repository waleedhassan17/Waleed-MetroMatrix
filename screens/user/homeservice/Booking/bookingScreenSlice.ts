import { PayloadAction, createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchBookingData as fetchBookingDataApi,
  createBooking,
} from '../../../../networks/serviceProviders/bookingNetwork';
import {
  bookingDataSerializer,
} from '../../../../serializers/serviceProviders/bookingSerializer';

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
  bookingConfirmation: {
    bookingId: string;
    status: 'pending' | 'confirmed' | 'cancelled';
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
        params: { providerId: string; category: 'electricians' | 'plumbers' | 'ac-repairers' },
        { rejectWithValue }
      ) => {
        const response = await fetchBookingDataApi(params.providerId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to fetch booking data');
        }
        const serialized = bookingDataSerializer(response.data);
        return mapApiBookingDataToLocal(serialized);
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload.provider;
          state.savedAddresses = action.payload.addresses;
          state.timeSlots = action.payload.timeSlots;
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

    submitBooking: create.asyncThunk(
      async (bookingDetails: BookingDetails, { rejectWithValue }) => {
        const response = await createBooking({
          providerId: bookingDetails.providerId,
          selectedDate: bookingDetails.selectedDate,
          selectedTime: bookingDetails.selectedTime,
          addressId: bookingDetails.selectedAddress?.id || '',
          instructions: bookingDetails.instructions,
        });
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to submit booking');
        }
        return {
          bookingId: response.data.bookingId,
          status: 'confirmed' as const,
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
          };
        },
        rejected: (state, action) => {
          state.isSubmitting = false;
          state.error = action.payload as string;
        },
      }
    ),

    addNewAddress: create.asyncThunk(
      async (address: Omit<SavedAddress, 'id'>, { rejectWithValue }) => {
        // Simulate API call for adding address
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          ...address,
          id: `addr-${Date.now()}`,
        } as SavedAddress;
      },
      {
        fulfilled: (state, action) => {
          state.savedAddresses.push(action.payload);
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

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
  },
});

// Actions
export const {
  fetchBookingData,
  submitBooking,
  addNewAddress,
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