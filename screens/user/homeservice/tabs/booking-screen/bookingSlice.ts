// Bookings Slice - Redux state management for home service bookings
import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../../store/createAppSlice';
import type { RootState } from '../../../../../store/store';
import {
  fetchUserBookings,
  updateUserBookingStatus,
  cancelUserBooking,
  rateUserBooking,
  UserBooking,
} from '../../../../../networks/serviceProviders/userNetwork';
import {
  createBooking as createBookingApi,
} from '../../../../../networks/serviceProviders/bookingNetwork';

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

// Helper to map API booking to local format
const mapApiBookingToLocal = (apiBooking: UserBooking): Booking => ({
  id: apiBooking.id,
  serviceId: apiBooking.serviceId,
  serviceName: apiBooking.serviceName,
  serviceImage: apiBooking.serviceImage,
  categoryType: apiBooking.categoryType as CategoryType,
  providerId: apiBooking.providerId,
  providerName: apiBooking.providerName,
  providerAvatar: apiBooking.providerAvatar,
  status: apiBooking.status,
  date: apiBooking.date,
  time: apiBooking.time,
  address: apiBooking.address,
  price: apiBooking.price,
  rating: apiBooking.rating,
  review: apiBooking.review,
  createdAt: apiBooking.createdAt,
  updatedAt: apiBooking.updatedAt,
});

// Slice
const homeServiceBookingsSlice = createAppSlice({
  name: 'homeServiceBookings',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchBookings: create.asyncThunk(
      async (filter: BookingFilter | undefined, { rejectWithValue }) => {
        try {
          const response = await fetchUserBookings({
            status: filter?.status,
          });
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch bookings.');
          }
          return response.data.map(mapApiBookingToLocal);
        } catch (error) {
          return rejectWithValue('Failed to fetch bookings.');
        }
      },
      {
        pending: (state) => {
          state.loading.fetch = true;
          state.error.fetch = null;
        },
        fulfilled: (state, action) => {
          state.loading.fetch = false;
          state.bookings = action.payload;
          state.pagination.total = action.payload.length;
        },
        rejected: (state, action) => {
          state.loading.fetch = false;
          state.error.fetch = action.payload as string;
        },
      }
    ),

    createBooking: create.asyncThunk(
      async (bookingData: Partial<Booking>, { rejectWithValue }) => {
        try {
          const response = await createBookingApi({
            providerId: bookingData.providerId || '',
            selectedDate: bookingData.date || '',
            selectedTime: bookingData.time || '',
            addressId: bookingData.address || '',
            instructions: '',
          });
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to create booking.');
          }
          
          const newBooking: Booking = {
            id: response.data?.bookingId || `b${Date.now()}`,
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
          return rejectWithValue('Failed to create booking.');
        }
      },
      {
        pending: (state) => {
          state.loading.create = true;
          state.error.create = null;
        },
        fulfilled: (state, action) => {
          state.loading.create = false;
          state.bookings.unshift(action.payload);
          state.pagination.total += 1;
        },
        rejected: (state, action) => {
          state.loading.create = false;
          state.error.create = action.payload as string;
        },
      }
    ),

    updateBookingStatus: create.asyncThunk(
      async (
        params: { bookingId: string; status: BookingStatus },
        { rejectWithValue }
      ) => {
        try {
          const response = await updateUserBookingStatus(params.bookingId, params.status);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to update booking.');
          }
          return params;
        } catch (error) {
          return rejectWithValue('Failed to update booking.');
        }
      },
      {
        pending: (state) => {
          state.loading.update = true;
          state.error.update = null;
        },
        fulfilled: (state, action) => {
          state.loading.update = false;
          const { bookingId, status } = action.payload;
          const booking = state.bookings.find((b) => b.id === bookingId);
          if (booking) {
            booking.status = status;
            booking.updatedAt = new Date().toISOString();
          }
          if (state.selectedBooking?.id === bookingId) {
            state.selectedBooking.status = status;
          }
        },
        rejected: (state, action) => {
          state.loading.update = false;
          state.error.update = action.payload as string;
        },
      }
    ),

    cancelBooking: create.asyncThunk(
      async (bookingId: string, { rejectWithValue }) => {
        try {
          const response = await cancelUserBooking(bookingId);
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to cancel booking.');
          }
          return bookingId;
        } catch (error) {
          return rejectWithValue('Failed to cancel booking.');
        }
      },
      {
        pending: (state) => {
          state.loading.cancel = true;
          state.error.cancel = null;
        },
        fulfilled: (state, action) => {
          state.loading.cancel = false;
          const bookingId = action.payload;
          const booking = state.bookings.find((b) => b.id === bookingId);
          if (booking) {
            booking.status = 'cancelled';
            booking.updatedAt = new Date().toISOString();
          }
          if (state.selectedBooking?.id === bookingId) {
            state.selectedBooking.status = 'cancelled';
          }
        },
        rejected: (state, action) => {
          state.loading.cancel = false;
          state.error.cancel = action.payload as string;
        },
      }
    ),

    rateBooking: create.asyncThunk(
      async (
        params: { bookingId: string; rating: number; review?: string },
        { rejectWithValue }
      ) => {
        try {
          const response = await rateUserBooking(
            params.bookingId,
            params.rating,
            params.review
          );
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to rate booking.');
          }
          return params;
        } catch (error) {
          return rejectWithValue('Failed to rate booking.');
        }
      },
      {
        fulfilled: (state, action) => {
          const { bookingId, rating, review } = action.payload;
          const booking = state.bookings.find((b) => b.id === bookingId);
          if (booking) {
            booking.rating = rating;
            booking.review = review;
            booking.updatedAt = new Date().toISOString();
          }
          if (state.selectedBooking?.id === bookingId) {
            state.selectedBooking.rating = rating;
            state.selectedBooking.review = review;
          }
        },
      }
    ),

    // Sync reducers
    setSelectedBooking: create.reducer((state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    }),

    setActiveFilter: create.reducer((state, action: PayloadAction<BookingStatus | 'all'>) => {
      state.activeFilter = action.payload;
    }),

    setFilter: create.reducer((state, action: PayloadAction<BookingFilter>) => {
      state.filter = { ...state.filter, ...action.payload };
    }),

    clearFilter: create.reducer((state) => {
      state.filter = {};
      state.activeFilter = 'all';
    }),

    clearErrors: create.reducer((state) => {
      state.error = {
        fetch: null,
        create: null,
        update: null,
        cancel: null,
      };
    }),

    resetPagination: create.reducer((state) => {
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        hasMore: false,
      };
    }),
  }),
  selectors: {
    selectHomeServiceBookings: (state) => state.bookings,
    selectSelectedBooking: (state) => state.selectedBooking,
    selectActiveFilter: (state) => state.activeFilter,
    selectBookingsFilter: (state) => state.filter,
    selectBookingsLoading: (state) => state.loading,
    selectBookingsError: (state) => state.error,
    selectBookingsPagination: (state) => state.pagination,
  },
});

// Actions
export const {
  fetchBookings,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  rateBooking,
  setSelectedBooking,
  setActiveFilter,
  setFilter,
  clearFilter,
  clearErrors,
  resetPagination,
} = homeServiceBookingsSlice.actions;

// Selectors
export const {
  selectHomeServiceBookings,
  selectSelectedBooking,
  selectActiveFilter,
  selectBookingsFilter,
  selectBookingsLoading,
  selectBookingsError,
  selectBookingsPagination,
} = homeServiceBookingsSlice.selectors;

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