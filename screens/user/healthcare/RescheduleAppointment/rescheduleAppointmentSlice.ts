import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Appointment, TimeSlot } from '../../../../models/healthcare/types';
import { fetchTimeSlotsApi, rescheduleAppointmentApi } from '../../../../networks/healthcare/appointmentApi';

// ── State ───────────────────────────────────

interface RescheduleAppointmentState {
  appointment: Appointment | null;
  newDate: string | null;
  newSlot: TimeSlot | null;
  availableSlots: TimeSlot[];
  loading: boolean;
  error: string | null;
}

const initialState: RescheduleAppointmentState = {
  appointment: null,
  newDate: null,
  newSlot: null,
  availableSlots: [],
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchAvailableSlots = createAsyncThunk<
  TimeSlot[],
  { doctorId: string; date: string },
  { rejectValue: string }
>('rescheduleAppointment/fetchAvailableSlots', async ({ doctorId, date }, { rejectWithValue }) => {
  try {
    const res = await fetchTimeSlotsApi({ doctorId, date });
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load available slots');
  }
});

export const confirmReschedule = createAsyncThunk<
  Appointment,
  void,
  { state: { rescheduleAppointment: RescheduleAppointmentState }; rejectValue: string }
>('rescheduleAppointment/confirmReschedule', async (_, { getState, rejectWithValue }) => {
  try {
    const { appointment, newDate, newSlot } = getState().rescheduleAppointment;
    if (!appointment || !newDate || !newSlot) {
      return rejectWithValue('Missing reschedule data');
    }

    const res = await rescheduleAppointmentApi({
      appointmentId: appointment.appointmentId,
      date: newDate,
      timeSlot: { start: newSlot.startTime, end: newSlot.endTime },
    });
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to reschedule appointment');
  }
});

// ── Slice ───────────────────────────────────

const rescheduleAppointmentSlice = createSlice({
  name: 'rescheduleAppointment',
  initialState,
  reducers: {
    setAppointment(state, action: PayloadAction<Appointment>) {
      state.appointment = action.payload;
    },
    setNewDate(state, action: PayloadAction<string>) {
      state.newDate = action.payload;
      state.newSlot = null;
      state.availableSlots = [];
    },
    setNewSlot(state, action: PayloadAction<TimeSlot | null>) {
      state.newSlot = action.payload;
    },
    resetReschedule() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.loading = false;
        state.availableSlots = action.payload;
      })
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      .addCase(confirmReschedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmReschedule.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(confirmReschedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  setAppointment,
  setNewDate,
  setNewSlot,
  resetReschedule,
} = rescheduleAppointmentSlice.actions;

export default rescheduleAppointmentSlice.reducer;
