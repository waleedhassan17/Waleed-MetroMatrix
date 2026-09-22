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
  { doctorId: string; date: string; type?: Appointment['type']; clinicId?: string },
  { rejectValue: string }
>(
  'rescheduleAppointment/fetchAvailableSlots',
  async ({ doctorId, date, type, clinicId }, { rejectWithValue }) => {
    try {
      // Rescheduling MOVES an appointment; it does not change what kind of
      // appointment it is. Unfiltered, this offered video times for an
      // in-clinic visit — and the backend copies the new slot's clinic across
      // while leaving `type` alone, so accepting one produced an in-clinic
      // appointment sitting on a video slot.
      const res = await fetchTimeSlotsApi({ doctorId, date, type, clinicId });
      if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
      return res.data;
    } catch {
      return rejectWithValue('Failed to load available slots');
    }
  }
);

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

    // `newSlotId` is the only field the endpoint reads, and its validator
    // requires it. This used to send `date` + `timeSlot` instead — neither of
    // which goes on the wire — so every reschedule was rejected with a 400
    // before the controller ever ran. The backend's release-then-claim of the
    // old and new slots was correct all along; it was simply never reached.
    const res = await rescheduleAppointmentApi({
      appointmentId: appointment.appointmentId,
      newSlotId: newSlot.slotId,
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
