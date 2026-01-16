// Bookings Slice - Redux state management for home service bookings
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../store/store';

// Types
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'upcoming' | 'completed' | 'cancelled';
export type CategoryType = 'retail' | 'medical' | 'maintenance';

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceImage: string;
  categoryType: CategoryType;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  status: BookingStatus;
  date: string;
  time: string;
  address: string;
  price: number;
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilter {
  status?: BookingStatus;
  categoryType?: CategoryType;
  dateFrom?: string;
  dateTo?: string;
}

// Mock Data for testing
const mockBookings: Booking[] = [
  {
    id: 'b1',
    serviceId: 's1',
    serviceName: 'AC Repair',
    serviceImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd',
    categoryType: 'maintenance',
    providerId: 'p1',
    providerName: 'Ahmad Khan',
    providerAvatar: 'https://i.pravatar.cc/100?img=1',
    status: 'completed',
    date: '2026-01-10',
    time: '10:00 AM',
    address: '123 Main St, Islamabad',
    price: 2500,
    rating: 5,
    review: 'Excellent service!',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'b2',
    serviceId: 's2',
    serviceName: 'Plumbing',
    serviceImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7',
    categoryType: 'maintenance',
    providerId: 'p2',
    providerName: 'Usman Ali',
    providerAvatar: 'https://i.pravatar.cc/100?img=2',
    status: 'upcoming',
    date: '2026-01-15',
    time: '2:00 PM',
    address: '456 Park Ave, Lahore',
    price: 1800,
    createdAt: '2026-01-11T08:00:00Z',
    updatedAt: '2026-01-11T08:00:00Z',
  },
];

// State Interface
interface BookingsState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  filter: BookingFilter;
  activeFilter: BookingStatus | 'all';
  loading: {
    fetch: boolean;
    create: boolean;
    update: boolean;
    cancel: boolean;
  };
  error: {
    fetch: string | null;
    create: string | null;
    update: string | null;
    cancel: string | null;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Initial State
const initialState: BookingsState = {
  bookings: [],
  selectedBooking: null,
  filter: {},
  activeFilter: 'all',
  loading: {
    fetch: false,
    create: false,
    update: false,
    cancel: false,
  },
  error: {
    fetch: null,
    create: null,
    update: null,
    cancel: null,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
  },
};

// Async Thunks
export const fetchBookings = createAsyncThunk<Booking[], BookingFilter | undefined>(
  'homeServiceBookings/fetchBookings',
  async (filter, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let filteredBookings = [...mockBookings];
      
      if (filter?.status) {
        filteredBookings = filteredBookings.filter((b: Booking) => b.status === filter.status);
      }
      
      // Sort by date
      filteredBookings.sort((a: Booking, b: Booking) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return filteredBookings;
    } catch (error) {
      return rejectWithValue('Failed to fetch bookings');
    }
  }
);

export const createBooking = createAsyncThunk<Booking, Partial<Booking>>(
  'homeServiceBookings/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newBooking: Booking = {
        id: `b${Date.now()}`,
        serviceId: bookingData.serviceId || '',
        serviceName: bookingData.serviceName || '',
        serviceImage: bookingData.serviceImage || '',
        categoryType: bookingData.categoryType || 'maintenance',
        providerId: bookingData.providerId || '',
        providerName: bookingData.providerName || '',
        providerAvatar: bookingData.providerAvatar || '',
        status: 'pending',
        date: bookingData.date || '',
        time: bookingData.time || '',
        address: bookingData.address || '',
        price: bookingData.price || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return newBooking;
    } catch (error) {
      return rejectWithValue('Failed to create booking');
    }
  }
);

export const updateBookingStatus = createAsyncThunk<
  { bookingId: string; status: BookingStatus },
  { bookingId: string; status: BookingStatus }
>(
  'homeServiceBookings/updateBookingStatus',
  async ({ bookingId, status }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      return { bookingId, status };
    } catch (error) {
      return rejectWithValue('Failed to update booking');
    }
  }
);

export const cancelBooking = createAsyncThunk<string, string>(
  'homeServiceBookings/cancelBooking',
  async (bookingId, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      return bookingId;
    } catch (error) {
      return rejectWithValue('Failed to cancel booking');
    }
  }
);

export const rateBooking = createAsyncThunk<
  { bookingId: string; rating: number; review?: string },
  { bookingId: string; rating: number; review?: string }
>(
  'homeServiceBookings/rateBooking',
  async ({ bookingId, rating, review }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { bookingId, rating, review };
    } catch (error) {
      return rejectWithValue('Failed to rate booking');
    }
  }
);

// Slice
const homeServiceBookingsSlice = createSlice({
  name: 'homeServiceBookings',
  initialState,
  reducers: {
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },
    setActiveFilter: (state, action: PayloadAction<BookingStatus | 'all'>) => {
      state.activeFilter = action.payload;
    },
    setFilter: (state, action: PayloadAction<BookingFilter>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter: (state) => {
      state.filter = {};
      state.activeFilter = 'all';
    },
    clearErrors: (state) => {
      state.error = {
        fetch: null,
        create: null,
        update: null,
        cancel: null,
      };
    },
    resetPagination: (state) => {
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        hasMore: false,
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch Bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.bookings = action.payload;
        state.pagination.total = action.payload.length;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error.fetch = action.payload as string;
      });
    
    // Create Booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading.create = false;
        state.bookings.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload as string;
      });
    
    // Update Booking Status
    builder
      .addCase(updateBookingStatus.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.loading.update = false;
        const { bookingId, status } = action.payload;
        const booking = state.bookings.find((b: Booking) => b.id === bookingId);
        if (booking) {
          booking.status = status;
          booking.updatedAt = new Date().toISOString();
        }
        if (state.selectedBooking?.id === bookingId) {
          state.selectedBooking.status = status;
        }
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload as string;
      });
    
    // Cancel Booking
    builder
      .addCase(cancelBooking.pending, (state) => {
        state.loading.cancel = true;
        state.error.cancel = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.loading.cancel = false;
        const bookingId = action.payload;
        const booking = state.bookings.find((b: Booking) => b.id === bookingId);
        if (booking) {
          booking.status = 'cancelled';
          booking.updatedAt = new Date().toISOString();
        }
        if (state.selectedBooking?.id === bookingId) {
          state.selectedBooking.status = 'cancelled';
        }
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.loading.cancel = false;
        state.error.cancel = action.payload as string;
      });
    
    // Rate Booking
    builder
      .addCase(rateBooking.fulfilled, (state, action) => {
        const { bookingId, rating, review } = action.payload;
        const booking = state.bookings.find((b: Booking) => b.id === bookingId);
        if (booking) {
          booking.rating = rating;
          booking.review = review;
          booking.updatedAt = new Date().toISOString();
        }
        if (state.selectedBooking?.id === bookingId) {
          state.selectedBooking.rating = rating;
          state.selectedBooking.review = review;
        }
      });
  },
});

// Actions
export const {
  setSelectedBooking,
  setActiveFilter,
  setFilter,
  clearFilter,
  clearErrors,
  resetPagination,
} = homeServiceBookingsSlice.actions;

// Selectors
export const selectHomeServiceBookings = (state: RootState) => state.homeServiceBookings.bookings;
export const selectSelectedBooking = (state: RootState) => state.homeServiceBookings.selectedBooking;
export const selectActiveFilter = (state: RootState) => state.homeServiceBookings.activeFilter;
export const selectBookingsFilter = (state: RootState) => state.homeServiceBookings.filter;
export const selectBookingsLoading = (state: RootState) => state.homeServiceBookings.loading;
export const selectBookingsError = (state: RootState) => state.homeServiceBookings.error;
export const selectBookingsPagination = (state: RootState) => state.homeServiceBookings.pagination;

// Computed Selectors
export const selectFilteredBookings = (state: RootState) => {
  const { bookings, activeFilter } = state.homeServiceBookings;
  
  if (activeFilter === 'all') {
    return bookings;
  }
  
  return bookings.filter((booking: Booking) => booking.status === activeFilter);
};

export const selectBookingsByStatus = (status: BookingStatus) => (state: RootState) =>
  state.homeServiceBookings.bookings.filter((booking: Booking) => booking.status === status);

export const selectBookingById = (bookingId: string) => (state: RootState) =>
  state.homeServiceBookings.bookings.find((booking: Booking) => booking.id === bookingId);

export const selectBookingsCount = (state: RootState) => state.homeServiceBookings.bookings.length;

export const selectBookingsCountByStatus = (state: RootState) => ({
  all: state.homeServiceBookings.bookings.length,
  pending: state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'pending').length,
  confirmed: state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'confirmed').length,
  in_progress: state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'in_progress').length,
  upcoming: state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'upcoming').length,
  completed: state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'completed').length,
  cancelled: state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'cancelled').length,
});

export const selectUpcomingBookings = (state: RootState) =>
  state.homeServiceBookings.bookings.filter((b: Booking) => 
    b.status === 'upcoming' || b.status === 'pending' || b.status === 'confirmed'
  );

export const selectCompletedBookings = (state: RootState) =>
  state.homeServiceBookings.bookings.filter((b: Booking) => b.status === 'completed');

export default homeServiceBookingsSlice.reducer;