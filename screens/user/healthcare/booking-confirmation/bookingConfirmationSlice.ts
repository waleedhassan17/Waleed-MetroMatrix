import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  Doctor,
  Clinic,
  TimeSlot,
  PaymentRecord,
} from '../../../../models/healthcare/types';
import { applyCouponApi } from '../../../../networks/healthcare/providerApi';
import {
  bookAppointmentApi,
  payAppointmentApi,
} from '../../../../networks/healthcare/appointmentApi';
import { fetchDoctorByIdApi } from '../../../../networks/healthcare/doctorApi';
import type { RootState } from '../../../../store/store';
import { getDoctorDisplayName, getDoctorSpecialty } from '../../../../utils/healthcare/doctorDisplay';

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

/**
 * Why the booking summary could not be assembled. Each maps to a different
 * recovery action, so the screen can offer something better than "try again".
 */
export type BookingPrepErrorKind = 'slot' | 'clinic' | 'doctor' | 'fee';

export interface BookingPrepError {
  kind: BookingPrepErrorKind;
  message: string;
}

/** Hydration state for `bookingData`, kept separate from submission state. */
export type BookingDataStatus = 'idle' | 'preparing' | 'ready' | 'error';

export interface BookingConfirmationState {
  bookingData: BookingSummary | null;
  /** Hydration of `bookingData` — drives skeleton vs error vs content. */
  dataStatus: BookingDataStatus;
  dataError: string | null;
  dataErrorKind: BookingPrepErrorKind | null;
  patientDetails: PatientDetails;
  paymentMethod: PaymentRecord['method'];
  paymentPending: boolean;
  coupon: CouponInfo;
  loading: boolean;
  couponLoading: boolean;
  bookingStatus: BookingStatus;
  confirmedAppointmentId: string | null;
  confirmedCode: string | null;
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
  dataStatus: 'idle',
  dataError: null,
  dataErrorKind: null,
  patientDetails: initialPatientDetails,
  // Consultations are paid online from the wallet; this is the only method the
  // confirmation screen offers.
  paymentMethod: 'wallet',
  paymentPending: false,
  coupon: initialCoupon,
  loading: false,
  couponLoading: false,
  bookingStatus: 'idle',
  confirmedAppointmentId: null,
  confirmedCode: null,
  error: null,
  couponError: null,
  termsAccepted: false,
  reminderEnabled: true,
  lastUpdated: null,
};

// ── Helpers ─────────────────────────────────

/** Doctor-detail cache window, matching `selectNeedsRefresh` in that slice. */
const FIVE_MINUTES = 5 * 60 * 1000;

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

/**
 * Assembles the booking summary for `doctorId`.
 *
 * This used to be a `useEffect` in the screen that bailed out with a bare
 * `return` when the doctor or slot was missing. A bare `return` produces no
 * state transition, so the screen sat on its skeleton forever with no error
 * and no retry. Every failure is now a typed rejection the UI must handle.
 *
 * The doctor is read from the doctor-detail slice only when it is genuinely
 * this doctor and still fresh; otherwise it is fetched here, so the chain no
 * longer depends on which screen the user happened to arrive from.
 */
export const prepareBooking = createAsyncThunk<
  { summary: BookingSummary; symptoms?: string },
  string, // doctorId
  { state: RootState; rejectValue: BookingPrepError }
>(
  'bookingConfirmation/prepareBooking',
  async (doctorId, { getState, rejectWithValue }) => {
    const state = getState();
    const { slotSelection, clinicSelection, doctorDetail, healthcareBooking } = state;

    const slot = slotSelection.selectedSlot;
    if (!slot) {
      return rejectWithValue({
        kind: 'slot',
        message: 'Your time slot selection was lost. Please pick a slot again.',
      });
    }

    const consultationType = slotSelection.consultationType;

    const clinic =
      consultationType === 'in-clinic' ? clinicSelection.selectedClinic : null;
    if (consultationType === 'in-clinic' && !clinic) {
      return rejectWithValue({
        kind: 'clinic',
        message: 'No clinic was selected for this visit. Please choose a clinic.',
      });
    }

    // Reuse the cached doctor only when it is this doctor and recently loaded.
    const cached = doctorDetail?.doctor;
    const cacheUsable =
      !!cached &&
      cached.doctorId === doctorId &&
      !!doctorDetail?.lastUpdated &&
      Date.now() - doctorDetail.lastUpdated <= FIVE_MINUTES;

    let doctor = cacheUsable ? cached! : null;

    if (!doctor) {
      try {
        const res = await fetchDoctorByIdApi(doctorId);
        if (!res.success || !res.data) {
          return rejectWithValue({
            kind: 'doctor',
            message: res.message || "We couldn't load this doctor's details.",
          });
        }
        doctor = res.data;
      } catch (error: any) {
        return rejectWithValue({
          kind: 'doctor',
          message: error?.message?.includes('Network')
            ? 'No internet connection. Please check your network.'
            : "We couldn't load this doctor's details.",
        });
      }
    }

    const fee =
      consultationType === 'video'
        ? doctor.videoConsultationFee
        : doctor.consultationFee;

    // Mirrors `formatFee`'s rule that 0 is not a real fee — booking at a price
    // we cannot state is worse than refusing to proceed.
    if (!fee || fee <= 0) {
      return rejectWithValue({
        kind: 'fee',
        message:
          consultationType === 'video'
            ? 'This doctor has not set a video consultation fee.'
            : 'This doctor has not set a consultation fee.',
      });
    }

    return {
      summary: { doctor, slot, clinic, consultationType, fee },
      // Carried over so the doctor actually receives what the patient typed.
      symptoms: healthcareBooking?.symptoms,
    };
  }
);

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
          `Minimum order value of PKR ${couponData.minOrderValue} required`
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
  /** Booking succeeded but the follow-up payment call did not. */
  paymentFailed: boolean;
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

      // The backend books against a concrete slot (`slotId` is required and
      // must be a Mongo id). Sending date + timeSlot instead is what produced
      // "Validation failed: slotId is required".
      const slotId = bookingData.slot.slotId;
      if (!slotId) {
        return rejectWithValue(
          'This time slot is no longer valid. Please select another time.'
        );
      }

      // `patientInfo.name` and `patientInfo.phone` are required for BOTH
      // "Myself" and "Someone else". This used to be sent as `undefined`
      // whenever the patient booked for themselves.
      const account = getState().signIn?.user;
      const patientInfo =
        patientDetails.bookingFor === 'other'
          ? {
              name: patientDetails.name.trim(),
              phone: patientDetails.phone.trim(),
              relation: patientDetails.relation || 'other',
            }
          : {
              name: (account?.fullName || '').trim(),
              phone: (account?.phoneNumber || '').trim(),
              relation: 'self',
            };

      if (!patientInfo.name || !patientInfo.phone) {
        return rejectWithValue(
          patientDetails.bookingFor === 'self'
            ? 'Your profile is missing a name or phone number. Please complete your profile, or book for someone else.'
            : 'Patient name and phone number are required.'
        );
      }

      const res = await bookAppointmentApi({
        slotId,
        doctorId: bookingData.doctor.doctorId,
        clinicId: bookingData.clinic?.clinicId,
        type: bookingData.consultationType,
        patientDetails: patientInfo,
        couponCode: coupon.applied ? coupon.code : undefined,
        symptoms: patientDetails.notes,
      } as any);

      if (!res.success) {
        return rejectWithValue(res.message ?? 'Booking failed');
      }

      const appointmentId = res.data.appointmentId;

      // Payment is a separate call on the backend. A payment failure must not
      // discard a successfully booked appointment — report it and move on.
      let paymentFailed = false;
      try {
        const payRes = await payAppointmentApi(appointmentId, paymentMethod);
        paymentFailed = !payRes.success;
      } catch {
        paymentFailed = true;
      }

      return {
        appointmentId,
        confirmationCode: res.data.confirmationCode || `HC${Date.now()}`,
        paymentFailed,
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
      // prepareBooking — hydration of `bookingData`
      .addCase(prepareBooking.pending, (state) => {
        state.dataStatus = 'preparing';
        state.dataError = null;
        state.dataErrorKind = null;
      })
      .addCase(prepareBooking.fulfilled, (state, action) => {
        state.dataStatus = 'ready';
        state.bookingData = action.payload.summary;
        state.dataError = null;
        state.dataErrorKind = null;
        state.lastUpdated = Date.now();
        // Carry the symptoms the patient typed at step 2 into the field the
        // booking request actually sends.
        if (!state.patientDetails.notes && action.payload.symptoms) {
          state.patientDetails.notes = action.payload.symptoms;
        }
      })
      .addCase(prepareBooking.rejected, (state, action) => {
        state.dataStatus = 'error';
        state.bookingData = null;
        state.dataError =
          action.payload?.message ?? 'We could not prepare your booking.';
        state.dataErrorKind = action.payload?.kind ?? 'doctor';
      })

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
        // Kept so the success screen can show the real code instead of its
        // HC-XXXXXX placeholder.
        state.confirmedCode = action.payload.confirmationCode;
        state.paymentPending = action.payload.paymentFailed;
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
export const selectConfirmedCode = (state: RootState) =>
  state.bookingConfirmation.confirmedCode;

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
  return `PKR ${breakdown.total.toLocaleString()}`;
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

  return getDoctorDisplayName(bookingData.doctor);
};

// Get appointment summary
export const selectAppointmentSummary = (state: RootState) => {
  const { bookingData, paymentMethod } = state.bookingConfirmation;
  const feeBreakdown = selectFeeBreakdown(state);

  if (!bookingData) return null;

  return {
    doctorName: selectDoctorName(state),
    specialty: getDoctorSpecialty(bookingData.doctor),
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