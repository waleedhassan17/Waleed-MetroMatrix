import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  Appointment,
  TimeSlot,
  Doctor,
  Clinic,
} from '../../../../models/healthcare/types';
import {
  fetchTimeSlotsApi,
  bookAppointmentApi,
} from '../../../../networks/healthcare/appointmentApi';
import type { RootState } from '../../../../store/store';

// ── Types ───────────────────────────────────

export type ConsultationType = 'in-clinic' | 'video';

export interface BookingProgress {
  step: number;
  totalSteps: number;
  currentStepKey: 'type' | 'details' | 'review' | 'schedule' | 'confirm';
}

export interface SymptomTag {
  label: string;
  icon: string;
  selected: boolean;
}

// ── State ───────────────────────────────────

interface BookingState {
  // Selection state
  selectedDoctorId: string | null;
  selectedClinicId: string | null;
  selectedDate: string | null;
  selectedSlot: TimeSlot | null;
  appointmentType: ConsultationType;
  
  // Patient details
  symptoms: string;
  notes: string;
  selectedSymptomTags: string[];
  
  // Available data
  availableSlots: TimeSlot[];
  availableDates: string[];
  
  // Booking result
  currentAppointment: Appointment | null;
  bookingConfirmationCode: string | null;
  
  // UI state
  loading: boolean;
  slotsLoading: boolean;
  submitting: boolean;
  error: string | null;
  slotsError: string | null;
  submitError: string | null;
  
  // Progress tracking
  currentStep: number;
  completedSteps: number[];
  
  // Cache
  lastSlotsFetch: number | null;
  lastFetchParams: { doctorId: string; date: string; clinicId?: string } | null;
}

const initialState: BookingState = {
  selectedDoctorId: null,
  selectedClinicId: null,
  selectedDate: null,
  selectedSlot: null,
  appointmentType: 'in-clinic',
  symptoms: '',
  notes: '',
  selectedSymptomTags: [],
  availableSlots: [],
  availableDates: [],
  currentAppointment: null,
  bookingConfirmationCode: null,
  loading: false,
  slotsLoading: false,
  submitting: false,
  error: null,
  slotsError: null,
  submitError: null,
  currentStep: 0,
  completedSteps: [],
  lastSlotsFetch: null,
  lastFetchParams: null,
};

// ── Helpers ─────────────────────────────────

const generateConfirmationCode = (): string => {
  const prefix = 'HC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

const getNextAvailableDates = (days: number = 14): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    // Skip Sundays (optional)
    if (date.getDay() !== 0) {
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  
  return dates;
};

// ── Async Thunks ────────────────────────────

export const fetchBookingSlots = createAsyncThunk<
  TimeSlot[],
  { doctorId: string; date: string; clinicId?: string },
  { state: RootState; rejectValue: string }
>(
  'healthcareBooking/fetchBookingSlots',
  async (params, { getState, rejectWithValue }) => {
    try {
      // Check cache - don't refetch if same params within 2 minutes
      const { lastSlotsFetch, lastFetchParams } = getState().healthcareBooking;
      const isSameParams =
        lastFetchParams?.doctorId === params.doctorId &&
        lastFetchParams?.date === params.date &&
        lastFetchParams?.clinicId === params.clinicId;
      
      const twoMinutes = 2 * 60 * 1000;
      if (isSameParams && lastSlotsFetch && Date.now() - lastSlotsFetch < twoMinutes) {
        return getState().healthcareBooking.availableSlots;
      }
      
      const res = await fetchTimeSlotsApi(params);
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Failed to load time slots');
      }
      
      return res.data;
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please check your network.');
      }
      return rejectWithValue('Failed to load time slots');
    }
  }
);

export const refreshBookingSlots = createAsyncThunk<
  TimeSlot[],
  { doctorId: string; date: string; clinicId?: string },
  { rejectValue: string }
>(
  'healthcareBooking/refreshBookingSlots',
  async (params, { rejectWithValue }) => {
    try {
      const res = await fetchTimeSlotsApi(params);
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Failed to refresh slots');
      }
      
      return res.data;
    } catch {
      return rejectWithValue('Refresh failed');
    }
  }
);

export const submitBooking = createAsyncThunk<
  Appointment,
  void,
  { state: RootState; rejectValue: string }
>(
  'healthcareBooking/submitBooking',
  async (_, { getState, rejectWithValue }) => {
    try {
      const {
        selectedDoctorId,
        selectedClinicId,
        appointmentType,
        selectedDate,
        selectedSlot,
        symptoms,
        notes,
      } = getState().healthcareBooking;

      if (!selectedDoctorId || !selectedDate || !selectedSlot) {
        return rejectWithValue('Please complete all booking steps');
      }

      // Validate slot is still in the future
      const slotDateTime = new Date(`${selectedDate}T${selectedSlot.startTime}`);
      if (slotDateTime.getTime() <= Date.now()) {
        return rejectWithValue('Selected time slot has passed. Please choose another.');
      }

      const res = await bookAppointmentApi({
        doctorId: selectedDoctorId,
        clinicId: appointmentType === 'in-clinic' ? selectedClinicId ?? undefined : undefined,
        type: appointmentType,
        date: selectedDate,
        timeSlot: {
          start: selectedSlot.startTime,
          end: selectedSlot.endTime,
        },
        symptoms: symptoms || undefined,
        notes: notes || undefined,
      });

      if (!res.success) {
        if (res.message?.includes('slot')) {
          return rejectWithValue('This slot is no longer available. Please select another time.');
        }
        return rejectWithValue(res.message ?? 'Booking failed');
      }

      return res.data;
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please try again.');
      }
      return rejectWithValue('Something went wrong. Please try again.');
    }
  }
);

// ── Slice ───────────────────────────────────

const healthcareBookingSlice = createSlice({
  name: 'healthcareBooking',
  initialState,
  reducers: {
    setSelectedDoctorId(state, action: PayloadAction<string | null>) {
      state.selectedDoctorId = action.payload;
      // Generate available dates when doctor is selected
      if (action.payload) {
        state.availableDates = getNextAvailableDates(14);
      }
    },
    
    setSelectedClinicId(state, action: PayloadAction<string | null>) {
      state.selectedClinicId = action.payload;
      // Clear slot when clinic changes
      state.selectedSlot = null;
    },
    
    setSelectedDate(state, action: PayloadAction<string | null>) {
      state.selectedDate = action.payload;
      // Clear slot when date changes
      state.selectedSlot = null;
      state.availableSlots = [];
    },
    
    setSelectedSlot(state, action: PayloadAction<TimeSlot | null>) {
      state.selectedSlot = action.payload;
    },
    
    setAppointmentType(state, action: PayloadAction<ConsultationType>) {
      state.appointmentType = action.payload;
      // Clear clinic if switching to video
      if (action.payload === 'video') {
        state.selectedClinicId = null;
      }
    },
    
    setSymptoms(state, action: PayloadAction<string>) {
      state.symptoms = action.payload;
    },
    
    setNotes(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },
    
    toggleSymptomTag(state, action: PayloadAction<string>) {
      const tag = action.payload;
      const index = state.selectedSymptomTags.indexOf(tag);
      
      if (index > -1) {
        state.selectedSymptomTags.splice(index, 1);
      } else {
        state.selectedSymptomTags.push(tag);
      }
      
      // Update symptoms text
      state.symptoms = state.selectedSymptomTags.join(', ');
    },
    
    setCurrentStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
    },
    
    markStepCompleted(state, action: PayloadAction<number>) {
      if (!state.completedSteps.includes(action.payload)) {
        state.completedSteps.push(action.payload);
      }
    },
    
    clearErrors(state) {
      state.error = null;
      state.slotsError = null;
      state.submitError = null;
    },
    
    clearSlotSelection(state) {
      state.selectedSlot = null;
      state.selectedDate = null;
      state.availableSlots = [];
    },
    
    resetBooking() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch slots
      .addCase(fetchBookingSlots.pending, (state) => {
        state.slotsLoading = true;
        state.slotsError = null;
      })
      .addCase(fetchBookingSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        state.availableSlots = action.payload;
        state.lastSlotsFetch = Date.now();
        state.lastFetchParams = action.meta.arg;
      })
      .addCase(fetchBookingSlots.rejected, (state, action) => {
        state.slotsLoading = false;
        state.slotsError = action.payload ?? 'Failed to load slots';
      })
      
      // Refresh slots
      .addCase(refreshBookingSlots.pending, (state) => {
        state.slotsLoading = true;
      })
      .addCase(refreshBookingSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        state.availableSlots = action.payload;
        state.lastSlotsFetch = Date.now();
        state.lastFetchParams = action.meta.arg;
        // Clear selected slot if it's no longer available
        if (state.selectedSlot) {
          const stillAvailable = action.payload.some(
            (s) =>
              s.startTime === state.selectedSlot?.startTime &&
              s.endTime === state.selectedSlot?.endTime &&
              s.isAvailable
          );
          if (!stillAvailable) {
            state.selectedSlot = null;
          }
        }
      })
      .addCase(refreshBookingSlots.rejected, (state) => {
        state.slotsLoading = false;
      })
      
      // Submit booking
      .addCase(submitBooking.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitBooking.fulfilled, (state, action) => {
        state.submitting = false;
        state.currentAppointment = action.payload;
        state.bookingConfirmationCode = generateConfirmationCode();
      })
      .addCase(submitBooking.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Booking failed';
      });
  },
});

// ── Actions ─────────────────────────────────

export const {
  setSelectedDoctorId,
  setSelectedClinicId,
  setSelectedDate,
  setSelectedSlot,
  setAppointmentType,
  setSymptoms,
  setNotes,
  toggleSymptomTag,
  setCurrentStep,
  markStepCompleted,
  clearErrors,
  clearSlotSelection,
  resetBooking,
} = healthcareBookingSlice.actions;

// ── Selectors ───────────────────────────────

// Get selected IDs
export const selectSelectedDoctorId = (state: RootState) =>
  state.healthcareBooking.selectedDoctorId;

export const selectSelectedClinicId = (state: RootState) =>
  state.healthcareBooking.selectedClinicId;

export const selectSelectedDate = (state: RootState) =>
  state.healthcareBooking.selectedDate;

export const selectSelectedSlot = (state: RootState) =>
  state.healthcareBooking.selectedSlot;

// Get appointment type
export const selectAppointmentType = (state: RootState) =>
  state.healthcareBooking.appointmentType;

// Get patient details
export const selectSymptoms = (state: RootState) =>
  state.healthcareBooking.symptoms;

export const selectNotes = (state: RootState) =>
  state.healthcareBooking.notes;

export const selectSelectedSymptomTags = (state: RootState) =>
  state.healthcareBooking.selectedSymptomTags;

// Get available data
export const selectAvailableSlots = (state: RootState) =>
  state.healthcareBooking.availableSlots;

export const selectAvailableDates = (state: RootState) =>
  state.healthcareBooking.availableDates;

// Get available slots filtered
export const selectAvailableSlotsOnly = (state: RootState) =>
  state.healthcareBooking.availableSlots.filter((s) => s.isAvailable);

// Get morning slots
export const selectMorningSlots = (state: RootState) =>
  state.healthcareBooking.availableSlots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour < 12 && s.isAvailable;
  });

// Get afternoon slots
export const selectAfternoonSlots = (state: RootState) =>
  state.healthcareBooking.availableSlots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour >= 12 && hour < 17 && s.isAvailable;
  });

// Get evening slots
export const selectEveningSlots = (state: RootState) =>
  state.healthcareBooking.availableSlots.filter((s) => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour >= 17 && s.isAvailable;
  });

// Get loading states
export const selectIsLoading = (state: RootState) =>
  state.healthcareBooking.loading;

export const selectIsSlotsLoading = (state: RootState) =>
  state.healthcareBooking.slotsLoading;

export const selectIsSubmitting = (state: RootState) =>
  state.healthcareBooking.submitting;

// Get errors
export const selectError = (state: RootState) =>
  state.healthcareBooking.error;

export const selectSlotsError = (state: RootState) =>
  state.healthcareBooking.slotsError;

export const selectSubmitError = (state: RootState) =>
  state.healthcareBooking.submitError;

// Get booking result
export const selectCurrentAppointment = (state: RootState) =>
  state.healthcareBooking.currentAppointment;

export const selectBookingConfirmationCode = (state: RootState) =>
  state.healthcareBooking.bookingConfirmationCode;

// Get progress
export const selectCurrentStep = (state: RootState) =>
  state.healthcareBooking.currentStep;

export const selectCompletedSteps = (state: RootState) =>
  state.healthcareBooking.completedSteps;

// Check if step is completed
export const selectIsStepCompleted =
  (step: number) =>
  (state: RootState): boolean =>
    state.healthcareBooking.completedSteps.includes(step);

// Get booking progress
export const selectBookingProgress = (state: RootState): BookingProgress => {
  const { currentStep, appointmentType } = state.healthcareBooking;
  const totalSteps = appointmentType === 'in-clinic' ? 5 : 4;
  
  const stepKeys: BookingProgress['currentStepKey'][] =
    appointmentType === 'in-clinic'
      ? ['type', 'details', 'review', 'schedule', 'confirm']
      : ['type', 'details', 'review', 'confirm'];
  
  return {
    step: currentStep + 1,
    totalSteps,
    currentStepKey: stepKeys[currentStep] || 'type',
  };
};

// Check if can proceed to next step
export const selectCanProceed = (state: RootState): boolean => {
  const { currentStep, appointmentType, selectedClinicId, selectedSlot } =
    state.healthcareBooking;
  
  switch (currentStep) {
    case 0: // Type selection
      return !!appointmentType;
    case 1: // Details
      return true; // Details are optional
    case 2: // Review
      return true;
    case 3: // Schedule (clinic selection or slot)
      if (appointmentType === 'in-clinic') {
        return !!selectedClinicId && !!selectedSlot;
      }
      return !!selectedSlot;
    default:
      return false;
  }
};

// Check if booking is complete
export const selectIsBookingComplete = (state: RootState): boolean => {
  const {
    selectedDoctorId,
    selectedSlot,
    selectedDate,
    appointmentType,
    selectedClinicId,
  } = state.healthcareBooking;
  
  const hasBasicRequirements =
    !!selectedDoctorId && !!selectedSlot && !!selectedDate;
  
  if (appointmentType === 'in-clinic') {
    return hasBasicRequirements && !!selectedClinicId;
  }
  
  return hasBasicRequirements;
};

// Get formatted selected date
export const selectFormattedSelectedDate = (state: RootState): string => {
  const date = state.healthcareBooking.selectedDate;
  if (!date) return '';
  
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

// Get formatted selected time
export const selectFormattedSelectedTime = (state: RootState): string => {
  const slot = state.healthcareBooking.selectedSlot;
  if (!slot) return '';
  
  const formatTime = (time24: string): string => {
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ampm}`;
  };
  
  return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
};

// Check if has available slots
export const selectHasAvailableSlots = (state: RootState): boolean =>
  state.healthcareBooking.availableSlots.some((s) => s.isAvailable);

// Get slots count
export const selectAvailableSlotsCount = (state: RootState): number =>
  state.healthcareBooking.availableSlots.filter((s) => s.isAvailable).length;

// Check if needs slots refresh (after 2 minutes)
export const selectNeedsSlotsRefresh = (state: RootState): boolean => {
  const lastFetch = state.healthcareBooking.lastSlotsFetch;
  if (!lastFetch) return true;
  
  const twoMinutes = 2 * 60 * 1000;
  return Date.now() - lastFetch > twoMinutes;
};

// Get booking summary
export const selectBookingSummary = (state: RootState) => {
  const {
    appointmentType,
    symptoms,
    notes,
    selectedDate,
    selectedSlot,
    selectedClinicId,
  } = state.healthcareBooking;
  
  return {
    type: appointmentType,
    typeLabel: appointmentType === 'video' ? 'Video Consultation' : 'In-Clinic Visit',
    symptoms: symptoms || 'Not specified',
    notes: notes || null,
    date: selectFormattedSelectedDate(state),
    time: selectFormattedSelectedTime(state),
    hasClinic: !!selectedClinicId,
    hasSlot: !!selectedSlot,
  };
};

export default healthcareBookingSlice.reducer;