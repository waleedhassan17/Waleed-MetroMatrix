import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  Appointment,
  Prescription,
  Doctor,
  Clinic,
} from '../../../../models/healthcare/types';
import {
  fetchAppointmentByIdApi,
  cancelAppointmentApi,
  rescheduleAppointmentApi,
} from '../../../../networks/healthcare/appointmentApi';
import type { RootState } from '../../../../store/store';

// ── Types ───────────────────────────────────

export type AppointmentAction = 'cancel' | 'reschedule' | 'join' | 'directions';

export interface CancellationReason {
  id: string;
  label: string;
  icon: string;
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  { id: 'schedule_conflict', label: 'Schedule Conflict', icon: 'calendar-outline' },
  { id: 'feeling_better', label: 'Feeling Better', icon: 'heart-outline' },
  { id: 'found_another', label: 'Found Another Doctor', icon: 'person-outline' },
  { id: 'cost_concerns', label: 'Cost Concerns', icon: 'wallet-outline' },
  { id: 'transportation', label: 'Transportation Issues', icon: 'car-outline' },
  { id: 'other', label: 'Other Reason', icon: 'ellipsis-horizontal-outline' },
];

export interface AppointmentTimeline {
  event: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  icon: string;
}

// ── State ───────────────────────────────────

interface AppointmentDetailState {
  appointment: Appointment | null;
  prescription: Prescription | null;
  doctor: Doctor | null;
  clinic: Clinic | null;
  loading: boolean;
  refreshing: boolean;
  cancelling: boolean;
  rescheduling: boolean;
  cancelModalVisible: boolean;
  rescheduleModalVisible: boolean;
  selectedCancelReason: string | null;
  cancelReasonText: string;
  error: string | null;
  cancelError: string | null;
  rescheduleError: string | null;
  lastUpdated: number | null;
  // Video consultation specific
  canJoinCall: boolean;
  callJoinTime: number | null; // minutes before appointment when join becomes available
}

const initialState: AppointmentDetailState = {
  appointment: null,
  prescription: null,
  doctor: null,
  clinic: null,
  loading: false,
  refreshing: false,
  cancelling: false,
  rescheduling: false,
  cancelModalVisible: false,
  rescheduleModalVisible: false,
  selectedCancelReason: null,
  cancelReasonText: '',
  error: null,
  cancelError: null,
  rescheduleError: null,
  lastUpdated: null,
  canJoinCall: false,
  callJoinTime: 15, // Can join 15 minutes before
};

// ── Helpers ─────────────────────────────────

const canCancelAppointment = (appointment: Appointment): boolean => {
  if (!appointment) return false;
  
  // Can't cancel already cancelled or completed appointments
  if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
    return false;
  }
  
  // Check if appointment is in the future
  const appointmentDate = new Date(`${appointment.date}T${appointment.timeSlot.start}`);
  const now = new Date();
  
  // Must be at least 2 hours before appointment
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return appointmentDate.getTime() - now.getTime() > twoHoursMs;
};

const canRescheduleAppointment = (appointment: Appointment): boolean => {
  if (!appointment) return false;
  
  // Can only reschedule upcoming confirmed appointments
  if (!['confirmed', 'pending'].includes(appointment.status)) {
    return false;
  }
  
  // Check if appointment is in the future
  const appointmentDate = new Date(`${appointment.date}T${appointment.timeSlot.start}`);
  const now = new Date();
  
  // Must be at least 4 hours before appointment
  const fourHoursMs = 4 * 60 * 60 * 1000;
  return appointmentDate.getTime() - now.getTime() > fourHoursMs;
};

const canJoinVideoCall = (appointment: Appointment, joinTimeMinutes: number): boolean => {
  if (!appointment) return false;
  if (appointment.type !== 'video') return false;
  if (appointment.status !== 'confirmed') return false;
  
  const appointmentDate = new Date(`${appointment.date}T${appointment.timeSlot.start}`);
  const now = new Date();
  const joinTimeMs = joinTimeMinutes * 60 * 1000;
  
  // Can join X minutes before until appointment end time
  const endTime = new Date(`${appointment.date}T${appointment.timeSlot.end}`);
  const canJoinFrom = appointmentDate.getTime() - joinTimeMs;
  
  return now.getTime() >= canJoinFrom && now.getTime() <= endTime.getTime();
};

const getTimeUntilAppointment = (appointment: Appointment): number => {
  const appointmentDate = new Date(`${appointment.date}T${appointment.timeSlot.start}`);
  return appointmentDate.getTime() - Date.now();
};

// ── Async Thunks ────────────────────────────

export const fetchAppointmentDetail = createAsyncThunk<
  Appointment,
  string,
  { rejectValue: string }
>(
  'appointmentDetail/fetchAppointmentDetail',
  async (appointmentId, { rejectWithValue }) => {
    try {
      const res = await fetchAppointmentByIdApi(appointmentId);
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Failed to load appointment');
      }
      
      return res.data;
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please check your network.');
      }
      return rejectWithValue('Failed to load appointment details');
    }
  }
);

export const refreshAppointmentDetail = createAsyncThunk<
  Appointment,
  string,
  { rejectValue: string }
>(
  'appointmentDetail/refreshAppointmentDetail',
  async (appointmentId, { rejectWithValue }) => {
    try {
      const res = await fetchAppointmentByIdApi(appointmentId);
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Failed to refresh');
      }
      
      return res.data;
    } catch {
      return rejectWithValue('Refresh failed');
    }
  }
);

export const cancelAppointment = createAsyncThunk<
  void,
  { appointmentId: string; reason: string; reasonText?: string },
  { rejectValue: string }
>(
  'appointmentDetail/cancelAppointment',
  async ({ appointmentId, reason, reasonText }, { rejectWithValue }) => {
    try {
      const fullReason = reasonText ? `${reason}: ${reasonText}` : reason;
      const res = await cancelAppointmentApi(appointmentId, fullReason);
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Cancellation failed');
      }
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection');
      }
      if (error.message?.includes('already')) {
        return rejectWithValue('This appointment has already been cancelled');
      }
      return rejectWithValue('Failed to cancel appointment');
    }
  }
);

interface RescheduleParams {
  appointmentId: string;
  newDate: string;
  newTimeSlot: { start: string; end: string };
}

export const rescheduleAppointment = createAsyncThunk<
  Appointment,
  RescheduleParams,
  { rejectValue: string }
>(
  'appointmentDetail/rescheduleAppointment',
  async ({ appointmentId, newDate, newTimeSlot }, { rejectWithValue }) => {
    try {
      const res = await rescheduleAppointmentApi({ appointmentId, date: newDate, timeSlot: newTimeSlot });
      
      if (!res.success) {
        return rejectWithValue(res.message ?? 'Reschedule failed');
      }
      
      return res.data;
    } catch (error: any) {
      if (error.message?.includes('slot')) {
        return rejectWithValue('Selected time slot is no longer available');
      }
      return rejectWithValue('Failed to reschedule appointment');
    }
  }
);

// ── Slice ───────────────────────────────────

const appointmentDetailSlice = createSlice({
  name: 'appointmentDetail',
  initialState,
  reducers: {
    toggleCancelModal(state) {
      state.cancelModalVisible = !state.cancelModalVisible;
      if (!state.cancelModalVisible) {
        // Reset cancel form when closing
        state.selectedCancelReason = null;
        state.cancelReasonText = '';
        state.cancelError = null;
      }
    },
    
    toggleRescheduleModal(state) {
      state.rescheduleModalVisible = !state.rescheduleModalVisible;
      if (!state.rescheduleModalVisible) {
        state.rescheduleError = null;
      }
    },
    
    setSelectedCancelReason(state, action: PayloadAction<string>) {
      state.selectedCancelReason = action.payload;
    },
    
    setCancelReasonText(state, action: PayloadAction<string>) {
      state.cancelReasonText = action.payload;
    },
    
    updateCanJoinCall(state) {
      if (state.appointment && state.callJoinTime) {
        state.canJoinCall = canJoinVideoCall(state.appointment, state.callJoinTime);
      }
    },
    
    clearErrors(state) {
      state.error = null;
      state.cancelError = null;
      state.rescheduleError = null;
    },
    
    resetAppointmentDetail() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch appointment
      .addCase(fetchAppointmentDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.appointment = action.payload;
        state.prescription = action.payload.prescription ?? null;
        state.doctor = null;
        state.clinic = null;
        state.lastUpdated = Date.now();
        
        // Update join call status
        if (state.callJoinTime) {
          state.canJoinCall = canJoinVideoCall(action.payload, state.callJoinTime);
        }
      })
      .addCase(fetchAppointmentDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      
      // Refresh appointment
      .addCase(refreshAppointmentDetail.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(refreshAppointmentDetail.fulfilled, (state, action) => {
        state.refreshing = false;
        state.appointment = action.payload;
        state.prescription = action.payload.prescription ?? null;
        state.doctor = null;
        state.clinic = null;
        state.lastUpdated = Date.now();
      })
      .addCase(refreshAppointmentDetail.rejected, (state) => {
        state.refreshing = false;
      })
      
      // Cancel appointment
      .addCase(cancelAppointment.pending, (state) => {
        state.cancelling = true;
        state.cancelError = null;
      })
      .addCase(cancelAppointment.fulfilled, (state) => {
        state.cancelling = false;
        state.cancelModalVisible = false;
        state.selectedCancelReason = null;
        state.cancelReasonText = '';
        if (state.appointment) {
          state.appointment.status = 'cancelled';
        }
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
        state.cancelling = false;
        state.cancelError = action.payload ?? 'Cancellation failed';
      })
      
      // Reschedule appointment
      .addCase(rescheduleAppointment.pending, (state) => {
        state.rescheduling = true;
        state.rescheduleError = null;
      })
      .addCase(rescheduleAppointment.fulfilled, (state, action) => {
        state.rescheduling = false;
        state.rescheduleModalVisible = false;
        state.appointment = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(rescheduleAppointment.rejected, (state, action) => {
        state.rescheduling = false;
        state.rescheduleError = action.payload ?? 'Reschedule failed';
      });
  },
});

// ── Actions ─────────────────────────────────

export const {
  toggleCancelModal,
  toggleRescheduleModal,
  setSelectedCancelReason,
  setCancelReasonText,
  updateCanJoinCall,
  clearErrors,
  resetAppointmentDetail,
} = appointmentDetailSlice.actions;

// ── Selectors ───────────────────────────────

// Get appointment
export const selectAppointment = (state: RootState) =>
  state.appointmentDetail.appointment;

// Get prescription
export const selectPrescription = (state: RootState) =>
  state.appointmentDetail.prescription;

// Get doctor info
export const selectDoctor = (state: RootState) =>
  state.appointmentDetail.doctor;

// Get clinic info
export const selectClinic = (state: RootState) =>
  state.appointmentDetail.clinic;

// Get loading states
export const selectIsLoading = (state: RootState) =>
  state.appointmentDetail.loading;

export const selectIsRefreshing = (state: RootState) =>
  state.appointmentDetail.refreshing;

export const selectIsCancelling = (state: RootState) =>
  state.appointmentDetail.cancelling;

export const selectIsRescheduling = (state: RootState) =>
  state.appointmentDetail.rescheduling;

// Get modal visibility
export const selectCancelModalVisible = (state: RootState) =>
  state.appointmentDetail.cancelModalVisible;

export const selectRescheduleModalVisible = (state: RootState) =>
  state.appointmentDetail.rescheduleModalVisible;

// Get errors
export const selectError = (state: RootState) =>
  state.appointmentDetail.error;

export const selectCancelError = (state: RootState) =>
  state.appointmentDetail.cancelError;

export const selectRescheduleError = (state: RootState) =>
  state.appointmentDetail.rescheduleError;

// Get cancellation form state
export const selectSelectedCancelReason = (state: RootState) =>
  state.appointmentDetail.selectedCancelReason;

export const selectCancelReasonText = (state: RootState) =>
  state.appointmentDetail.cancelReasonText;

// Check if can cancel
export const selectCanCancel = (state: RootState): boolean => {
  const appointment = state.appointmentDetail.appointment;
  return appointment ? canCancelAppointment(appointment) : false;
};

// Check if can reschedule
export const selectCanReschedule = (state: RootState): boolean => {
  const appointment = state.appointmentDetail.appointment;
  return appointment ? canRescheduleAppointment(appointment) : false;
};

// Check if can join video call
export const selectCanJoinCall = (state: RootState): boolean =>
  state.appointmentDetail.canJoinCall;

// Get appointment status
export const selectAppointmentStatus = (state: RootState) =>
  state.appointmentDetail.appointment?.status ?? null;

// Check if appointment is upcoming
export const selectIsUpcoming = (state: RootState): boolean => {
  const appointment = state.appointmentDetail.appointment;
  if (!appointment) return false;
  
  if (!['confirmed', 'pending'].includes(appointment.status)) return false;
  
  const appointmentDate = new Date(`${appointment.date}T${appointment.timeSlot.start}`);
  return appointmentDate.getTime() > Date.now();
};

// Check if appointment is today
export const selectIsToday = (state: RootState): boolean => {
  const appointment = state.appointmentDetail.appointment;
  if (!appointment) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return appointment.date === today;
};

// Get time until appointment
export const selectTimeUntilAppointment = (state: RootState): number | null => {
  const appointment = state.appointmentDetail.appointment;
  if (!appointment) return null;
  
  return getTimeUntilAppointment(appointment);
};

// Get formatted time until appointment
export const selectFormattedTimeUntil = (state: RootState): string | null => {
  const timeMs = selectTimeUntilAppointment(state);
  if (timeMs === null) return null;
  
  if (timeMs < 0) return 'Past';
  
  const minutes = Math.floor(timeMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} away`;
  return 'Starting now';
};

// Get appointment type label
export const selectAppointmentTypeLabel = (state: RootState): string => {
  const appointment = state.appointmentDetail.appointment;
  if (!appointment) return '';
  
  return appointment.type === 'video' ? 'Video Consultation' : 'In-Clinic Visit';
};

// Get available actions for appointment
export const selectAvailableActions = (state: RootState): AppointmentAction[] => {
  const appointment = state.appointmentDetail.appointment;
  if (!appointment) return [];
  
  const actions: AppointmentAction[] = [];
  
  if (appointment.type === 'video' && state.appointmentDetail.canJoinCall) {
    actions.push('join');
  }
  
  if (appointment.type === 'in-clinic' && appointment.clinicId) {
    actions.push('directions');
  }
  
  if (canRescheduleAppointment(appointment)) {
    actions.push('reschedule');
  }
  
  if (canCancelAppointment(appointment)) {
    actions.push('cancel');
  }
  
  return actions;
};

// Get appointment timeline
export const selectAppointmentTimeline = (state: RootState): AppointmentTimeline[] => {
  const appointment = state.appointmentDetail.appointment;
  if (!appointment) return [];
  
  const timeline: AppointmentTimeline[] = [];
  const now = Date.now();
  const appointmentTime = new Date(`${appointment.date}T${appointment.timeSlot.start}`).getTime();
  
  // Booked
  timeline.push({
    event: 'Appointment Booked',
    timestamp: appointment.createdAt || appointment.date,
    status: 'completed',
    icon: 'checkmark-circle',
  });
  
  // Confirmed
  if (appointment.status !== 'pending') {
    timeline.push({
      event: 'Appointment Confirmed',
      timestamp: appointment.confirmedAt || appointment.date,
      status: 'completed',
      icon: 'shield-checkmark',
    });
  }
  
  // Upcoming / In Progress
  if (['confirmed', 'pending'].includes(appointment.status)) {
    timeline.push({
      event: 'Scheduled Time',
      timestamp: `${appointment.date}T${appointment.timeSlot.start}`,
      status: now >= appointmentTime ? 'current' : 'pending',
      icon: 'time',
    });
  }
  
  // Completed
  if (appointment.status === 'completed') {
    timeline.push({
      event: 'Consultation Completed',
      timestamp: appointment.createdAt || appointment.date,
      status: 'completed',
      icon: 'checkmark-done-circle',
    });
  }
  
  // Cancelled
  if (appointment.status === 'cancelled') {
    timeline.push({
      event: 'Appointment Cancelled',
      timestamp: appointment.createdAt || appointment.date,
      status: 'completed',
      icon: 'close-circle',
    });
  }
  
  return timeline;
};

// Check if has prescription
export const selectHasPrescription = (state: RootState): boolean =>
  state.appointmentDetail.prescription !== null;

// Get doctor name
export const selectDoctorName = (state: RootState): string => {
  const doctor = state.appointmentDetail.doctor;
  if (!doctor) return '';
  
  const name = doctor.bio?.split(' ')[1];
  return name ? `Dr. ${name}` : 'Doctor';
};

// Check if cancel form is valid
export const selectIsCancelFormValid = (state: RootState): boolean => {
  const { selectedCancelReason, cancelReasonText } = state.appointmentDetail;
  
  if (!selectedCancelReason) return false;
  
  // If "other" is selected, require text
  if (selectedCancelReason === 'other' && !cancelReasonText.trim()) {
    return false;
  }
  
  return true;
};

// Check if needs refresh (after 2 minutes for appointments)
export const selectNeedsRefresh = (state: RootState): boolean => {
  const lastUpdated = state.appointmentDetail.lastUpdated;
  if (!lastUpdated) return true;
  
  const twoMinutes = 2 * 60 * 1000;
  return Date.now() - lastUpdated > twoMinutes;
};

export default appointmentDetailSlice.reducer;