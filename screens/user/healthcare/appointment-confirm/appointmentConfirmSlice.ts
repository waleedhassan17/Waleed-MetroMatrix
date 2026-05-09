import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  Appointment,
  Doctor,
  Clinic,
  TimeSlot,
} from '../../../../models/healthcare/types';
import { fetchAppointmentByIdApi } from '../../../../networks/healthcare/appointmentApi';
import type { RootState } from '../../../../store/store';

// ── Types ───────────────────────────────────

export interface ConfirmationDetails {
  appointmentId: string;
  confirmationCode: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  type: 'video' | 'in-clinic';
  clinicName: string | null;
  clinicAddress: string | null;
  fee: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface ReminderSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  reminderTimes: number[]; // minutes before appointment
}

export interface CalendarEvent {
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  notes: string;
}

// ── State ───────────────────────────────────

interface AppointmentConfirmState {
  appointmentId: string | null;
  confirmationCode: string | null;
  appointment: Appointment | null;
  doctor: Doctor | null;
  clinic: Clinic | null;
  confirmed: boolean;
  loading: boolean;
  fetchingDetails: boolean;
  addingToCalendar: boolean;
  sharingDetails: boolean;
  error: string | null;
  // Confirmation screen state
  showConfetti: boolean;
  animationComplete: boolean;
  // Actions taken
  addedToCalendar: boolean;
  sharedDetails: boolean;
  savedContact: boolean;
  // Reminder settings
  reminderSettings: ReminderSettings;
  // Timestamps
  confirmedAt: number | null;
}

const initialReminderSettings: ReminderSettings = {
  smsEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  reminderTimes: [1440, 60, 15], // 24 hours, 1 hour, 15 minutes
};

const initialState: AppointmentConfirmState = {
  appointmentId: null,
  confirmationCode: null,
  appointment: null,
  doctor: null,
  clinic: null,
  confirmed: false,
  loading: false,
  fetchingDetails: false,
  addingToCalendar: false,
  sharingDetails: false,
  error: null,
  showConfetti: false,
  animationComplete: false,
  addedToCalendar: false,
  sharedDetails: false,
  savedContact: false,
  reminderSettings: initialReminderSettings,
  confirmedAt: null,
};

// ── Helpers ─────────────────────────────────

const formatTime12 = (time24: string): string => {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const generateConfirmationCode = (): string => {
  const prefix = 'HC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 10);
};

// ── Async Thunks ────────────────────────────

export const fetchConfirmedAppointment = createAsyncThunk<
  Appointment,
  string,
  { rejectValue: string }
>(
  'appointmentConfirm/fetchConfirmedAppointment',
  async (appointmentId, { rejectWithValue }) => {
    try {
      const res = await fetchAppointmentByIdApi(appointmentId);
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Failed to load appointment');
      }
      
      return res.data;
    } catch (error: any) {
      return rejectWithValue('Failed to load appointment details');
    }
  }
);

export const addToCalendar = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>(
  'appointmentConfirm/addToCalendar',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { appointment, doctor, clinic } = getState().appointmentConfirm;
      
      if (!appointment) {
        return rejectWithValue('No appointment data');
      }
      
      // In a real app, this would use a calendar API
      // For now, we simulate the action
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      return true;
    } catch {
      return rejectWithValue('Failed to add to calendar');
    }
  }
);

export const shareAppointmentDetails = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>(
  'appointmentConfirm/shareAppointmentDetails',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { appointment } = getState().appointmentConfirm;
      
      if (!appointment) {
        return rejectWithValue('No appointment data');
      }
      
      // In a real app, this would use the Share API
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      return true;
    } catch {
      return rejectWithValue('Failed to share details');
    }
  }
);

// ── Slice ───────────────────────────────────

const appointmentConfirmSlice = createSlice({
  name: 'appointmentConfirm',
  initialState,
  reducers: {
    setAppointmentId(state, action: PayloadAction<string>) {
      state.appointmentId = action.payload;
    },
    
    setConfirmationCode(state, action: PayloadAction<string>) {
      state.confirmationCode = action.payload;
    },
    
    setConfirmed(state, action: PayloadAction<boolean>) {
      state.confirmed = action.payload;
      if (action.payload) {
        state.confirmedAt = Date.now();
        state.showConfetti = true;
        // Generate confirmation code if not set
        if (!state.confirmationCode) {
          state.confirmationCode = generateConfirmationCode();
        }
      }
    },
    
    setAppointmentData(
      state,
      action: PayloadAction<{
        appointment: Appointment;
        doctor?: Doctor;
        clinic?: Clinic;
      }>
    ) {
      state.appointment = action.payload.appointment;
      state.doctor = action.payload.doctor ?? null;
      state.clinic = action.payload.clinic ?? null;
      state.appointmentId = action.payload.appointment.appointmentId;
    },
    
    setShowConfetti(state, action: PayloadAction<boolean>) {
      state.showConfetti = action.payload;
    },
    
    setAnimationComplete(state, action: PayloadAction<boolean>) {
      state.animationComplete = action.payload;
    },
    
    setSavedContact(state, action: PayloadAction<boolean>) {
      state.savedContact = action.payload;
    },
    
    updateReminderSettings(
      state,
      action: PayloadAction<Partial<ReminderSettings>>
    ) {
      state.reminderSettings = {
        ...state.reminderSettings,
        ...action.payload,
      };
    },
    
    toggleReminderTime(state, action: PayloadAction<number>) {
      const time = action.payload;
      const times = state.reminderSettings.reminderTimes;
      const index = times.indexOf(time);
      
      if (index > -1) {
        state.reminderSettings.reminderTimes = times.filter((t) => t !== time);
      } else {
        state.reminderSettings.reminderTimes = [...times, time].sort(
          (a, b) => b - a
        );
      }
    },
    
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    
    clearError(state) {
      state.error = null;
    },
    
    resetAppointmentConfirm() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch confirmed appointment
      .addCase(fetchConfirmedAppointment.pending, (state) => {
        state.fetchingDetails = true;
        state.error = null;
      })
      .addCase(fetchConfirmedAppointment.fulfilled, (state, action) => {
        state.fetchingDetails = false;
        state.appointment = action.payload;
        state.doctor = null;
        state.clinic = null;
      })
      .addCase(fetchConfirmedAppointment.rejected, (state, action) => {
        state.fetchingDetails = false;
        state.error = action.payload ?? 'Failed to load';
      })
      
      // Add to calendar
      .addCase(addToCalendar.pending, (state) => {
        state.addingToCalendar = true;
      })
      .addCase(addToCalendar.fulfilled, (state) => {
        state.addingToCalendar = false;
        state.addedToCalendar = true;
      })
      .addCase(addToCalendar.rejected, (state, action) => {
        state.addingToCalendar = false;
        state.error = action.payload ?? 'Failed';
      })
      
      // Share details
      .addCase(shareAppointmentDetails.pending, (state) => {
        state.sharingDetails = true;
      })
      .addCase(shareAppointmentDetails.fulfilled, (state) => {
        state.sharingDetails = false;
        state.sharedDetails = true;
      })
      .addCase(shareAppointmentDetails.rejected, (state, action) => {
        state.sharingDetails = false;
        state.error = action.payload ?? 'Failed';
      });
  },
});

// ── Actions ─────────────────────────────────

export const {
  setAppointmentId,
  setConfirmationCode,
  setConfirmed,
  setAppointmentData,
  setShowConfetti,
  setAnimationComplete,
  setSavedContact,
  updateReminderSettings,
  toggleReminderTime,
  setLoading,
  setError,
  clearError,
  resetAppointmentConfirm,
} = appointmentConfirmSlice.actions;

// ── Selectors ───────────────────────────────

// Get appointment ID
export const selectAppointmentId = (state: RootState) =>
  state.appointmentConfirm.appointmentId;

// Get confirmation code
export const selectConfirmationCode = (state: RootState) =>
  state.appointmentConfirm.confirmationCode;

// Get appointment
export const selectAppointment = (state: RootState) =>
  state.appointmentConfirm.appointment;

// Get doctor
export const selectDoctor = (state: RootState) =>
  state.appointmentConfirm.doctor;

// Get clinic
export const selectClinic = (state: RootState) =>
  state.appointmentConfirm.clinic;

// Get confirmed status
export const selectIsConfirmed = (state: RootState) =>
  state.appointmentConfirm.confirmed;

// Get loading states
export const selectIsLoading = (state: RootState) =>
  state.appointmentConfirm.loading;

export const selectIsFetchingDetails = (state: RootState) =>
  state.appointmentConfirm.fetchingDetails;

export const selectIsAddingToCalendar = (state: RootState) =>
  state.appointmentConfirm.addingToCalendar;

export const selectIsSharingDetails = (state: RootState) =>
  state.appointmentConfirm.sharingDetails;

// Get error
export const selectError = (state: RootState) =>
  state.appointmentConfirm.error;

// Get confetti state
export const selectShowConfetti = (state: RootState) =>
  state.appointmentConfirm.showConfetti;

// Get animation state
export const selectAnimationComplete = (state: RootState) =>
  state.appointmentConfirm.animationComplete;

// Get actions taken
export const selectAddedToCalendar = (state: RootState) =>
  state.appointmentConfirm.addedToCalendar;

export const selectSharedDetails = (state: RootState) =>
  state.appointmentConfirm.sharedDetails;

export const selectSavedContact = (state: RootState) =>
  state.appointmentConfirm.savedContact;

// Get reminder settings
export const selectReminderSettings = (state: RootState) =>
  state.appointmentConfirm.reminderSettings;

// Get confirmed timestamp
export const selectConfirmedAt = (state: RootState) =>
  state.appointmentConfirm.confirmedAt;

// Get confirmation details
export const selectConfirmationDetails = (
  state: RootState
): ConfirmationDetails | null => {
  const {
    appointmentId,
    confirmationCode,
    appointment,
    doctor,
    clinic,
  } = state.appointmentConfirm;

  if (!appointmentId || !appointment) return null;

  const doctorName = doctor?.bio?.split(' ')[1]
    ? `Dr. ${doctor.bio.split(' ')[1]}`
    : 'Doctor';

  return {
    appointmentId,
    confirmationCode: confirmationCode || generateConfirmationCode(),
    doctorName,
    doctorSpecialty: doctor?.subspecialties?.[0] || 'Specialist',
    date: formatDate(appointment.date),
    time: `${formatTime12(appointment.timeSlot.start)} - ${formatTime12(
      appointment.timeSlot.end
    )}`,
    type: appointment.type,
    clinicName: clinic?.name || null,
    clinicAddress: clinic ? `${clinic.address}, ${clinic.city}` : null,
    fee: appointment.payment?.amount || 0,
    paymentMethod: appointment.payment?.method || 'cash',
    paymentStatus: appointment.payment?.status || 'pending',
  };
};

// Get calendar event data
export const selectCalendarEvent = (state: RootState): CalendarEvent | null => {
  const { appointment, doctor, clinic } = state.appointmentConfirm;

  if (!appointment) return null;

  const doctorName = doctor?.bio?.split(' ')[1]
    ? `Dr. ${doctor.bio.split(' ')[1]}`
    : 'Doctor';

  const startDate = new Date(
    `${appointment.date}T${appointment.timeSlot.start}`
  );
  const endDate = new Date(`${appointment.date}T${appointment.timeSlot.end}`);

  return {
    title: `Appointment with ${doctorName}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location:
      appointment.type === 'video'
        ? 'Video Consultation'
        : clinic
        ? `${clinic.name}, ${clinic.address}`
        : null,
    notes: `${appointment.type === 'video' ? 'Video' : 'In-Clinic'} consultation`,
  };
};

// Get share message
export const selectShareMessage = (state: RootState): string => {
  const details = selectConfirmationDetails(state);

  if (!details) return '';

  let message = `🏥 Appointment Confirmed!\n\n`;
  message += `📋 Code: ${details.confirmationCode}\n`;
  message += `👨‍⚕️ ${details.doctorName}\n`;
  message += `📅 ${details.date}\n`;
  message += `⏰ ${details.time}\n`;

  if (details.type === 'video') {
    message += `💻 Video Consultation\n`;
  } else if (details.clinicName) {
    message += `📍 ${details.clinicName}\n`;
  }

  message += `\n💰 Fee: PKR ${details.fee}`;

  return message;
};

// Get doctor name
export const selectDoctorName = (state: RootState): string => {
  const doctor = state.appointmentConfirm.doctor;
  if (!doctor) return 'Doctor';

  const name = doctor.bio?.split(' ')[1];
  return name ? `Dr. ${name}` : 'Doctor';
};

// Get appointment type label
export const selectAppointmentTypeLabel = (state: RootState): string => {
  const appointment = state.appointmentConfirm.appointment;
  if (!appointment) return '';

  return appointment.type === 'video' ? 'Video Consultation' : 'In-Clinic Visit';
};

// Get formatted date
export const selectFormattedDate = (state: RootState): string => {
  const appointment = state.appointmentConfirm.appointment;
  if (!appointment) return '';

  return formatDate(appointment.date);
};

// Get formatted time
export const selectFormattedTime = (state: RootState): string => {
  const appointment = state.appointmentConfirm.appointment;
  if (!appointment) return '';

  return `${formatTime12(appointment.timeSlot.start)} - ${formatTime12(
    appointment.timeSlot.end
  )}`;
};

// Check if any action is in progress
export const selectIsAnyActionInProgress = (state: RootState): boolean => {
  const {
    loading,
    fetchingDetails,
    addingToCalendar,
    sharingDetails,
  } = state.appointmentConfirm;

  return loading || fetchingDetails || addingToCalendar || sharingDetails;
};

// Get next steps based on appointment type
export const selectNextSteps = (state: RootState): string[] => {
  const appointment = state.appointmentConfirm.appointment;
  if (!appointment) return [];

  const steps: string[] = [];

  if (appointment.type === 'video') {
    steps.push('You will receive a link to join the video call before your appointment');
    steps.push('Ensure you have a stable internet connection');
    steps.push('Find a quiet, well-lit space for your consultation');
  } else {
    steps.push('Arrive 10-15 minutes before your scheduled time');
    steps.push('Bring your ID and any relevant medical records');
    steps.push('Carry your prescription history if applicable');
  }

  steps.push('You will receive reminders before your appointment');

  return steps;
};

// Check if reminder time is enabled
export const selectIsReminderTimeEnabled =
  (time: number) =>
  (state: RootState): boolean => {
    return state.appointmentConfirm.reminderSettings.reminderTimes.includes(time);
  };

export default appointmentConfirmSlice.reducer;