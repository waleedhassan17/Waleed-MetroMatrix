import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  Doctor,
  Clinic,
  TimeSlot,
  PaymentRecord,
} from '../../../../models/healthcare/types';
import { applyCouponApi } from '../../../../networks/healthcare/providerApi';
import { bookAppointmentApi } from '../../../../networks/healthcare/appointmentApi';
import type { RootState } from '../../../../store/store';

// ── Types ───────────────────────────────────

export interface PatientDetails {
  bookingFor: 'self' | 'other';
  name: string;
  phone: string;
  relation?: string;
  email?: string;
  notes?: string;
}

export interface CouponInfo {
  code: string;
  discount: number; // percentage 0-100
  applied: boolean;
  maxDiscount?: number; // maximum discount amount
  minOrderValue?: number; // minimum order value required
}

export interface BookingSummary {
  doctor: Doctor;
  slot: TimeSlot;
  clinic: Clinic | null; // null when video consultation
  consultationType: 'in-clinic' | 'video';
  fee: number;
}

export interface FeeBreakdown {
  subtotal: number;
  discount: number;
  platformFee: number;
  total: number;
  savings: number;
}

export type BookingStatus = 'idle' | 'confirming' | 'confirmed' | 'failed';

export interface BookingConfirmationState {
  bookingData: BookingSummary | null;
  patientDetails: PatientDetails;
  paymentMethod: PaymentRecord['method'];
  coupon: CouponInfo;
  loading: boolean;
  couponLoading: boolean;
  bookingStatus: BookingStatus;
  confirmedAppointmentId: string | null;
  error: string | null;
  couponError: string | null;
  // Additional state
  termsAccepted: boolean;
  reminderEnabled: boolean;
  lastUpdated: number | null;
}

// ── Initial State ───────────────────────────

const initialPatientDetails: PatientDetails = {
  bookingFor: 'self',
  name: '',
  phone: '',
  relation: undefined,
  email: undefined,
  notes: undefined,
};

const initialCoupon: CouponInfo = {
  code: '',
  discount: 0,
  applied: false,
  maxDiscount: undefined,
  minOrderValue: undefined,
};

const initialState: BookingConfirmationState = {
  bookingData: null,
  patientDetails: initialPatientDetails,
  paymentMethod: 'cash',
  coupon: initialCoupon,
  loading: false,
  couponLoading: false,
  bookingStatus: 'idle',
  confirmedAppointmentId: null,
  error: null,
  couponError: null,
  termsAccepted: false,
  reminderEnabled: true,
  lastUpdated: null,
};

// ── Helpers ─────────────────────────────────

const calculateFeeBreakdown = (
  fee: number,
  coupon: CouponInfo,
  platformFee: number = 0
): FeeBreakdown => {
  const subtotal = fee;
  let discount = 0;

  if (coupon.applied && coupon.discount > 0) {
    discount = Math.round(subtotal * (coupon.discount / 100));

    // Apply max discount cap if exists
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  }

  const total = Math.max(0, subtotal - discount + platformFee);
  const savings = discount;

  return { subtotal, discount, platformFee, total, savings };
};

// ── Async Thunks ────────────────────────────

export const applyCoupon = createAsyncThunk<
  CouponInfo,
  string, // coupon code
  { state: RootState; rejectValue: string }
>(
  'bookingConfirmation/applyCoupon',
  async (code, { getState, rejectWithValue }) => {
    try {
      const { bookingData } = getState().bookingConfirmation;

      if (!bookingData) {
        return rejectWithValue('No booking data available');
      }

      const res = await applyCouponApi(code);

      if (!res.success) {
        return rejectWithValue(res.message ?? 'Invalid coupon code');
      }

      const couponData = res.data;

      // Check minimum order value
      if (
        couponData.minOrderValue &&
        bookingData.fee < couponData.minOrderValue
      ) {
        return rejectWithValue(
          `Minimum order value of Rs. ${couponData.minOrderValue} required`
        );
      }

      return {
        code: couponData.code,
        discount: couponData.discountPercent,
        applied: true,
        maxDiscount: couponData.maxDiscount,
        minOrderValue: couponData.minOrderValue,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection');
      }
      return rejectWithValue('Failed to validate coupon');
    }
  }
);

interface ConfirmBookingPayload {
  appointmentId: string;
  confirmationCode: string;
}

export const confirmBooking = createAsyncThunk<
  ConfirmBookingPayload,
  void,
  { state: RootState; rejectValue: string }
>(
  'bookingConfirmation/confirmBooking',
  async (_, { getState, rejectWithValue }) => {
    try {
      const {
        bookingData,
        patientDetails,
        paymentMethod,
        coupon,
        termsAccepted,
      } = getState().bookingConfirmation;

      if (!bookingData) {
        return rejectWithValue('No booking data');
      }

      // Validate patient details for "other"
      if (patientDetails.bookingFor === 'other') {
        if (!patientDetails.name.trim()) {
          return rejectWithValue('Patient name is required');
        }
        if (!patientDetails.phone.trim()) {
          return rejectWithValue('Patient phone number is required');
        }
        // Basic phone validation
        const phoneRegex = /^03\d{9}$/;
        if (!phoneRegex.test(patientDetails.phone.replace(/\s/g, ''))) {
          return rejectWithValue('Please enter a valid phone number');
        }
      }

      const res = await bookAppointmentApi({
        doctorId: bookingData.doctor.doctorId,
        clinicId: bookingData.clinic?.clinicId,
        type: bookingData.consultationType,
        date: bookingData.slot.date,
        timeSlot: {
          start: bookingData.slot.startTime,
          end: bookingData.slot.endTime,
        },
        patientDetails:
          patientDetails.bookingFor === 'other'
            ? {
                name: patientDetails.name,
                phone: patientDetails.phone,
                relation: patientDetails.relation,
              }
            : undefined,
        paymentMethod,
        couponCode: coupon.applied ? coupon.code : undefined,
        symptoms: patientDetails.notes,
      });

      if (!res.success) {
        return rejectWithValue(res.message ?? 'Booking failed');
      }

      return {
        appointmentId: res.data.appointmentId,
        confirmationCode: res.data.confirmationCode || `HC${Date.now()}`,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please try again.');
      }
      if (error.message?.includes('slot')) {
        return rejectWithValue(
          'This slot is no longer available. Please select another time.'
        );
      }
      return rejectWithValue('Something went wrong. Please try again.');
    }
  }
);

// ── Slice ───────────────────────────────────

const bookingConfirmationSlice = createSlice({
  name: 'bookingConfirmation',
  initialState,
  reducers: {
    setBookingData(state, action: PayloadAction<BookingSummary>) {
      state.bookingData = action.payload;
      state.lastUpdated = Date.now();
    },

    setPatientDetails(state, action: PayloadAction<Partial<PatientDetails>>) {
      state.patientDetails = { ...state.patientDetails, ...action.payload };
    },

    setPaymentMethod(state, action: PayloadAction<PaymentRecord['method']>) {
      state.paymentMethod = action.payload;
    },

    setTermsAccepted(state, action: PayloadAction<boolean>) {
      state.termsAccepted = action.payload;
    },

    setReminderEnabled(state, action: PayloadAction<boolean>) {
      state.reminderEnabled = action.payload;
    },

    removeCoupon(state) {
      state.coupon = initialCoupon;
      state.couponError = null;
    },

    clearError(state) {
      state.error = null;
      state.couponError = null;
    },

    resetBookingStatus(state) {
      state.bookingStatus = 'idle';
      state.error = null;
    },

    clearBooking() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // applyCoupon
      .addCase(applyCoupon.pending, (state) => {
        state.couponLoading = true;
        state.couponError = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.couponLoading = false;
        state.coupon = action.payload;
        state.couponError = null;
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.couponLoading = false;
        state.couponError = action.payload ?? 'Invalid coupon';
        state.coupon = initialCoupon;
      })

      // confirmBooking
      .addCase(confirmBooking.pending, (state) => {
        state.bookingStatus = 'confirming';
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmBooking.fulfilled, (state, action) => {
        state.bookingStatus = 'confirmed';
        state.loading = false;
        state.confirmedAppointmentId = action.payload.appointmentId;
      })
      .addCase(confirmBooking.rejected, (state, action) => {
        state.bookingStatus = 'failed';
        state.loading = false;
        state.error = action.payload ?? 'Booking failed';
      });
  },
});

// ── Actions ─────────────────────────────────

export const {
  setBookingData,
  setPatientDetails,
  setPaymentMethod,
  setTermsAccepted,
  setReminderEnabled,
  removeCoupon,
  clearError,
  resetBookingStatus,
  clearBooking,
} = bookingConfirmationSlice.actions;

// ── Selectors ───────────────────────────────

// Get booking data
export const selectBookingData = (state: RootState) =>
  state.bookingConfirmation.bookingData;

// Get patient details
export const selectPatientDetails = (state: RootState) =>
  state.bookingConfirmation.patientDetails;

// Get payment method
export const selectPaymentMethod = (state: RootState) =>
  state.bookingConfirmation.paymentMethod;

// Get coupon info
export const selectCoupon = (state: RootState) =>
  state.bookingConfirmation.coupon;

// Get loading states
export const selectIsLoading = (state: RootState) =>
  state.bookingConfirmation.loading;

export const selectIsCouponLoading = (state: RootState) =>
  state.bookingConfirmation.couponLoading;

// Get booking status
export const selectBookingStatus = (state: RootState) =>
  state.bookingConfirmation.bookingStatus;

// Get errors
export const selectError = (state: RootState) =>
  state.bookingConfirmation.error;

export const selectCouponError = (state: RootState) =>
  state.bookingConfirmation.couponError;

// Get confirmed appointment ID
export const selectConfirmedAppointmentId = (state: RootState) =>
  state.bookingConfirmation.confirmedAppointmentId;

// Get fee breakdown
export const selectFeeBreakdown = (state: RootState): FeeBreakdown => {
  const { bookingData, coupon } = state.bookingConfirmation;

  if (!bookingData) {
    return { subtotal: 0, discount: 0, platformFee: 0, total: 0, savings: 0 };
  }

  return calculateFeeBreakdown(bookingData.fee, coupon);
};

// Get formatted fee
export const selectFormattedTotal = (state: RootState): string => {
  const breakdown = selectFeeBreakdown(state);
  return `Rs. ${breakdown.total.toLocaleString()}`;
};

// Check if has discount
export const selectHasDiscount = (state: RootState): boolean => {
  const { coupon } = state.bookingConfirmation;
  return coupon.applied && coupon.discount > 0;
};

// Get savings amount
export const selectSavingsAmount = (state: RootState): number => {
  const breakdown = selectFeeBreakdown(state);
  return breakdown.savings;
};

// Check if form is valid
export const selectIsFormValid = (state: RootState): boolean => {
  const { bookingData, patientDetails } = state.bookingConfirmation;

  if (!bookingData) return false;

  if (patientDetails.bookingFor === 'other') {
    if (!patientDetails.name.trim() || !patientDetails.phone.trim()) {
      return false;
    }
  }

  return true;
};

// Check if can confirm
export const selectCanConfirm = (state: RootState): boolean => {
  const isValid = selectIsFormValid(state);
  const { bookingStatus, loading } = state.bookingConfirmation;

  return isValid && bookingStatus !== 'confirming' && !loading;
};

// Get consultation type label
export const selectConsultationTypeLabel = (state: RootState): string => {
  const { bookingData } = state.bookingConfirmation;

  if (!bookingData) return '';

  if (bookingData.consultationType === 'video') {
    return 'Video Consultation';
  }

  return bookingData.clinic?.name || 'In-Clinic Visit';
};

// Get doctor name
export const selectDoctorName = (state: RootState): string => {
  const { bookingData } = state.bookingConfirmation;

  if (!bookingData) return '';

  const name = bookingData.doctor.bio?.split(' ')[1];
  return name ? `Dr. ${name}` : 'Doctor';
};

// Get appointment summary
export const selectAppointmentSummary = (state: RootState) => {
  const { bookingData, paymentMethod } = state.bookingConfirmation;
  const feeBreakdown = selectFeeBreakdown(state);

  if (!bookingData) return null;

  return {
    doctorName: selectDoctorName(state),
    specialty: bookingData.doctor.subspecialties?.[0] || 'Specialist',
    date: bookingData.slot.date,
    time: `${bookingData.slot.startTime} - ${bookingData.slot.endTime}`,
    type: selectConsultationTypeLabel(state),
    clinic: bookingData.clinic?.name || null,
    fee: feeBreakdown.total,
    paymentMethod,
  };
};

// Check if booking is in progress
export const selectIsBookingInProgress = (state: RootState): boolean => {
  return state.bookingConfirmation.bookingStatus === 'confirming';
};

// Check if booking succeeded
export const selectIsBookingSuccess = (state: RootState): boolean => {
  return state.bookingConfirmation.bookingStatus === 'confirmed';
};

// Check if booking failed
export const selectIsBookingFailed = (state: RootState): boolean => {
  return state.bookingConfirmation.bookingStatus === 'failed';
};

export default bookingConfirmationSlice.reducer;