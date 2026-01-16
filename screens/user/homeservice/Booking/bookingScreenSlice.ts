import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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

// Mock data
const MOCK_ADDRESSES: SavedAddress[] = [
  {
    id: '1',
    label: 'Home',
    address: '123 Main Street, Downtown, Faisalabad',
    icon: 'home',
    isDefault: true,
    coordinates: { latitude: 31.4504, longitude: 73.1350 },
  },
  {
    id: '2',
    label: 'Office',
    address: '456 Business Plaza, Canal Road, Faisalabad',
    icon: 'building',
    isDefault: false,
    coordinates: { latitude: 31.4279, longitude: 73.0758 },
  },
  {
    id: '3',
    label: 'Parents Home',
    address: '789 Garden Town, Lahore Road, Faisalabad',
    icon: 'home',
    isDefault: false,
    coordinates: { latitude: 31.4187, longitude: 73.0791 },
  },
];

const MOCK_TIME_SLOTS: TimeSlot[] = [
  { id: '1', time: '09:00 AM', available: true, period: 'morning' },
  { id: '2', time: '10:00 AM', available: true, period: 'morning' },
  { id: '3', time: '11:00 AM', available: false, period: 'morning' },
  { id: '4', time: '12:00 PM', available: true, period: 'afternoon' },
  { id: '5', time: '02:00 PM', available: true, period: 'afternoon' },
  { id: '6', time: '03:00 PM', available: true, period: 'afternoon' },
  { id: '7', time: '04:00 PM', available: true, period: 'afternoon' },
  { id: '8', time: '05:00 PM', available: true, period: 'evening' },
  { id: '9', time: '06:00 PM', available: false, period: 'evening' },
  { id: '10', time: '07:00 PM', available: true, period: 'evening' },
];

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
export const fetchBookingData = createAsyncThunk(
  'booking/fetchData',
  async ({ providerId, category }: { providerId: string; category: 'electricians' | 'plumbers' | 'ac-repairers' }) => {
    // Simulate API call
    return new Promise<{
      provider: ProviderInfo;
      addresses: SavedAddress[];
      timeSlots: TimeSlot[];
    }>((resolve) => {
      setTimeout(() => {
        const provider = MOCK_PROVIDERS[category] || MOCK_PROVIDERS.plumbers;
        resolve({
          provider: { ...provider, id: providerId },
          addresses: MOCK_ADDRESSES,
          timeSlots: MOCK_TIME_SLOTS,
        });
      }, 800);
    });
  }
);

export const submitBooking = createAsyncThunk(
  'booking/submit',
  async (bookingDetails: BookingDetails) => {
    // Simulate API call
    return new Promise<{ bookingId: string; status: 'confirmed' }>((resolve) => {
      setTimeout(() => {
        resolve({
          bookingId: `BK-${Date.now()}`,
          status: 'confirmed',
        });
      }, 1500);
    });
  }
);

export const addNewAddress = createAsyncThunk(
  'booking/addAddress',
  async (address: Omit<SavedAddress, 'id'>) => {
    // Simulate API call
    return new Promise<SavedAddress>((resolve) => {
      setTimeout(() => {
        resolve({
          ...address,
          id: `addr-${Date.now()}`,
        });
      }, 500);
    });
  }
);

// Slice
const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    setSelectedTime: (state, action: PayloadAction<string>) => {
      state.selectedTime = action.payload;
    },
    setSelectedAddress: (state, action: PayloadAction<SavedAddress | null>) => {
      state.selectedAddress = action.payload;
    },
    setInstructions: (state, action: PayloadAction<string>) => {
      state.instructions = action.payload;
    },
    clearBookingState: (state) => {
      state.selectedDate = '';
      state.selectedTime = '';
      state.selectedAddress = null;
      state.instructions = '';
      state.bookingConfirmation = null;
      state.error = null;
    },
    setDefaultAddress: (state) => {
      const defaultAddr = state.savedAddresses.find((addr) => addr.isDefault);
      if (defaultAddr) {
        state.selectedAddress = defaultAddr;
      }
    },
    updateAddressDefault: (state, action: PayloadAction<string>) => {
      state.savedAddresses = state.savedAddresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === action.payload,
      }));
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch booking data
      .addCase(fetchBookingData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookingData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload.provider;
        state.savedAddresses = action.payload.addresses;
        state.timeSlots = action.payload.timeSlots;
        // Set default address
        const defaultAddr = action.payload.addresses.find((addr) => addr.isDefault);
        if (defaultAddr) {
          state.selectedAddress = defaultAddr;
        }
      })
      .addCase(fetchBookingData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch booking data';
      })
      // Submit booking
      .addCase(submitBooking.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitBooking.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.bookingConfirmation = {
          bookingId: action.payload.bookingId,
          status: action.payload.status,
        };
      })
      .addCase(submitBooking.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to submit booking';
      })
      // Add new address
      .addCase(addNewAddress.fulfilled, (state, action) => {
        state.savedAddresses.push(action.payload);
      });
  },
});

// Actions
export const {
  setSelectedDate,
  setSelectedTime,
  setSelectedAddress,
  setInstructions,
  clearBookingState,
  setDefaultAddress,
  updateAddressDefault,
} = bookingSlice.actions;

// Selectors
export const selectIsFormValid = (state: { booking: BookingState }) => {
  const { selectedDate, selectedTime, selectedAddress } = state.booking;
  return Boolean(selectedDate && selectedTime && selectedAddress);
};

export const selectBookingSummary = (state: { booking: BookingState }): BookingDetails | null => {
  const { provider, selectedDate, selectedTime, selectedAddress, instructions } = state.booking;
  
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
};

export default bookingSlice.reducer;