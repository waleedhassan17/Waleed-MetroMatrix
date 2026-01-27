// FILE: screens/admin/providers/service-providers/tabs/bookings/bookingsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../../store/store';

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled' | 'in-progress';

export interface Booking {
  id: string;
  date: string;
  time: string;
  userName: string;
  providerName: string;
  service: string;
  category: string;
  amount: string;
  status: BookingStatus;
  location: string;
  image?: string;
  rating?: number;
}

interface BookingsState {
  bookings: Booking[];
  filteredBookings: Booking[];
  searchQuery: string;
  filterStatus: string;
  isLoading: boolean;
  error: string | null;
  selectedBooking: Booking | null;
}

const initialBookings: Booking[] = [
  {
    id: 'BK001',
    date: 'Jan 15, 2025',
    time: '10:00 AM',
    userName: 'Ahmed Hassan',
    providerName: 'CoolTech Services',
    service: 'AC Installation & Repair',
    category: 'MAINTENANCE',
    amount: 'PKR 2,500',
    status: 'upcoming',
    location: '123 Main Street, Lahore',
  },
  {
    id: 'BK002',
    date: 'Jan 8, 2025',
    time: '2:00 PM',
    userName: 'Fatima Khan',
    providerName: 'QuickFix Plumbing',
    service: 'Pipe Leak Repair',
    category: 'PLUMBING',
    amount: 'PKR 1,500',
    status: 'completed',
    location: '456 Garden Road, Lahore',
    rating: 5.0,
  },
  {
    id: 'BK003',
    date: 'Jan 12, 2025',
    time: '11:00 AM',
    userName: 'Ali Rahman',
    providerName: 'PowerPro Electric',
    service: 'Wiring & Installation',
    category: 'ELECTRICAL',
    amount: 'PKR 3,000',
    status: 'cancelled',
    location: '789 Tech Park, Lahore',
  },
  {
    id: 'BK004',
    date: 'Jan 10, 2025',
    time: '3:30 PM',
    userName: 'Sara Ahmed',
    providerName: 'SparkleClean',
    service: 'Deep House Cleaning',
    category: 'CLEANING',
    amount: 'PKR 4,200',
    status: 'in-progress',
    location: '321 Park Avenue, Faisalabad',
  },
];

const initialState: BookingsState = {
  bookings: initialBookings,
  filteredBookings: initialBookings,
  searchQuery: '',
  filterStatus: 'all',
  isLoading: false,
  error: null,
  selectedBooking: null,
};

const filterBookings = (
  bookings: Booking[],
  searchQuery: string,
  filterStatus: string
): Booking[] => {
  return bookings.filter(booking => {
    const matchesSearch =
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;

    return matchesSearch && matchesFilter;
  });
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredBookings = filterBookings(
        state.bookings,
        action.payload,
        state.filterStatus
      );
    },
    setFilterStatus: (state, action: PayloadAction<string>) => {
      state.filterStatus = action.payload;
      state.filteredBookings = filterBookings(
        state.bookings,
        state.searchQuery,
        action.payload
      );
    },
    addBooking: (state, action: PayloadAction<Booking>) => {
      state.bookings.unshift(action.payload);
      state.filteredBookings = filterBookings(
        state.bookings,
        state.searchQuery,
        state.filterStatus
      );
    },
    updateBooking: (state, action: PayloadAction<Booking>) => {
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
        state.filteredBookings = filterBookings(
          state.bookings,
          state.searchQuery,
          state.filterStatus
        );
      }
    },
    updateBookingStatus: (
      state,
      action: PayloadAction<{ id: string; status: BookingStatus }>
    ) => {
      const booking = state.bookings.find(b => b.id === action.payload.id);
      if (booking) {
        booking.status = action.payload.status;
        state.filteredBookings = filterBookings(
          state.bookings,
          state.searchQuery,
          state.filterStatus
        );
      }
    },
    deleteBooking: (state, action: PayloadAction<string>) => {
      state.bookings = state.bookings.filter(b => b.id !== action.payload);
      state.filteredBookings = filterBookings(
        state.bookings,
        state.searchQuery,
        state.filterStatus
      );
    },
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },
    rateBooking: (
      state,
      action: PayloadAction<{ id: string; rating: number }>
    ) => {
      const booking = state.bookings.find(b => b.id === action.payload.id);
      if (booking) {
        booking.rating = action.payload.rating;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setSearchQuery,
  setFilterStatus,
  addBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  setSelectedBooking,
  rateBooking,
} = bookingsSlice.actions;

// Selectors
export const selectBookingsCount = (state: RootState) =>
  state.adminSPBookings.bookings.length;

export const selectBookingsByStatus = (
  state: RootState,
  status: BookingStatus
) => state.adminSPBookings.bookings.filter((b: Booking) => b.status === status);

export const selectStatusCount = (
  state: RootState,
  status: string
) => {
  if (status === 'all') return state.adminSPBookings.bookings.length;
  return state.adminSPBookings.bookings.filter((b: Booking) => b.status === status).length;
};

export default bookingsSlice.reducer;