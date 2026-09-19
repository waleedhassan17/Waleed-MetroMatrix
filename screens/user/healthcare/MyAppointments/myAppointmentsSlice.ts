import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Appointment } from '../../../../models/healthcare/types';
import {
  fetchAppointmentsApi,
  cancelAppointmentApi,
} from '../../../../networks/healthcare/appointmentApi';

// ── State ───────────────────────────────────

type ActiveTab = 'upcoming' | 'past';

interface MyAppointmentsState {
  appointments: Appointment[];
  activeTab: ActiveTab;
  loading: boolean;
  error: string | null;

  /** The appointment the cancel sheet is open for, or null when it is closed. */
  cancelTargetId: string | null;
  cancelling: boolean;
  cancelError: string | null;
}

const initialState: MyAppointmentsState = {
  appointments: [],
  activeTab: 'upcoming',
  loading: false,
  error: null,
  cancelTargetId: null,
  cancelling: false,
  cancelError: null,
};

/**
 * Upcoming is filtered on this device from one newest-first page, so the page
 * must be big enough that a patient's older cancelled or past visits cannot
 * push a real upcoming appointment off the end of it.
 */
export const APPOINTMENT_PAGE = 100;

// ── Async Thunks ────────────────────────────

export const fetchMyAppointments = createAsyncThunk<
  Appointment[],
  { status?: Appointment['status']; limit?: number } | void,
  { rejectValue: string }
>('myAppointments/fetchMyAppointments', async (params, { rejectWithValue }) => {
  try {
    // The backend derives the patient from the auth token, so no patientId is
    // passed — the hardcoded 'patient-1' this used to send was ignored.
    const res = await fetchAppointmentsApi({ ...(params || {}) });
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data.appointments;
  } catch {
    return rejectWithValue('Failed to load appointments');
  }
});

/**
 * Cancel from the list.
 *
 * The list's Cancel button was `() => {}`. It calls the same endpoint the
 * detail screen does, and refetches afterwards so the card moves from Upcoming
 * to Past instead of sitting there looking live.
 */
export const cancelMyAppointment = createAsyncThunk<
  void,
  { appointmentId: string; reason: string; reasonText?: string },
  { rejectValue: string }
>(
  'myAppointments/cancelMyAppointment',
  async ({ appointmentId, reason, reasonText }, { dispatch, rejectWithValue }) => {
    const fullReason = reasonText?.trim() ? `${reason}: ${reasonText.trim()}` : reason;
    try {
      const res = await cancelAppointmentApi(appointmentId, fullReason);
      if (!res.success) return rejectWithValue(res.message ?? 'Cancellation failed');
      await dispatch(fetchMyAppointments({ limit: APPOINTMENT_PAGE }));
    } catch {
      return rejectWithValue('Failed to cancel appointment');
    }
  }
);

// ── Slice ───────────────────────────────────

const myAppointmentsSlice = createSlice({
  name: 'myAppointments',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<ActiveTab>) {
      state.activeTab = action.payload;
    },
    openCancelSheet(state, action: PayloadAction<string>) {
      state.cancelTargetId = action.payload;
      state.cancelError = null;
    },
    closeCancelSheet(state) {
      state.cancelTargetId = null;
      state.cancelError = null;
    },
    resetMyAppointments() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchMyAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
        // Deliberately keeps whatever is already on screen: a failed refresh
        // should not blank a list the patient can still read.
      })
      .addCase(cancelMyAppointment.pending, (state) => {
        state.cancelling = true;
        state.cancelError = null;
      })
      .addCase(cancelMyAppointment.fulfilled, (state) => {
        state.cancelling = false;
        state.cancelTargetId = null;
      })
      .addCase(cancelMyAppointment.rejected, (state, action) => {
        state.cancelling = false;
        // The sheet stays open so the message is attached to the thing it is
        // about, and the patient can simply try again.
        state.cancelError = action.payload ?? 'Failed to cancel appointment';
      });
  },
});

export const {
  setActiveTab,
  openCancelSheet,
  closeCancelSheet,
  resetMyAppointments,
} = myAppointmentsSlice.actions;

export default myAppointmentsSlice.reducer;
