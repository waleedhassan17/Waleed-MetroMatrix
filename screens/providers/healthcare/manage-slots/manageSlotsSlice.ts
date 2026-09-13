import { todayLocalISODate } from '../../../../utils/date/localDate';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Clinic,
  DoctorSlot,
  NewSlotInput,
  NewSlotType,
  SlotEdit,
} from '../../../../models/healthcare/types';
import {
  fetchManageSlotsApi,
  createDoctorSlotsApi,
  updateDoctorSlotApi,
  deleteDoctorSlotApi,
  approveAppointmentApi,
  declineAppointmentApi,
  createClinicApi,
  deleteClinicApi,
  type ClinicInput,
} from '../../../../networks/healthcare/providerApi';

// ============================================================================
// Manage Slots
//
// This slice used to be unable to create a slot at all. It loaded whatever
// already existed for a date, let the doctor flip a local `isAvailable` flag
// that nothing ever saved, and "Save" re-POSTed every slot on screen as a new
// one — so an empty day was a dead end ("No slots to save") and a populated day
// duplicated itself. Slot duration and max patients sat in state unused.
//
// Now the server is the only source of truth. The doctor describes a range
// ("09:00–12:00, 30 min, video + in-clinic at Gulberg"), the server creates it,
// and every change — create, edit, close, delete — is followed by a refetch, so
// what the doctor sees is exactly what patients can book.
// ============================================================================

export type SlotDuration = 15 | 20 | 30;

/** How far ahead of now a slot must start; mirrors BOOKING_LEAD_MINUTES on the server. */
const LEAD_MINUTES = 15;

export interface ManageSlotsState {
  slots: DoctorSlot[];
  clinics: Clinic[];
  selectedClinic: string | null;
  selectedDate: string;
  slotDuration: SlotDuration;
  maxPatientsPerSlot: number;
  newSlotType: NewSlotType;
  rangeStart: string;
  rangeEnd: string;
  loading: boolean;
  creating: boolean;
  /** The slot an edit/close/delete is in flight for, so only it shows a spinner. */
  busySlotId: string | null;
  /** Loading the day failed. */
  error: string | null;
  /** A create/edit/delete was refused — the server's own words. */
  actionError: string | null;
  /** Brief confirmation after a successful change. */
  notice: string | null;
  clinicSaving: boolean;
  clinicError: string | null;
}

const initialState: ManageSlotsState = {
  slots: [],
  clinics: [],
  selectedClinic: null,
  selectedDate: todayLocalISODate(),
  slotDuration: 30,
  maxPatientsPerSlot: 1,
  newSlotType: 'both',
  rangeStart: '09:00',
  rangeEnd: '12:00',
  loading: false,
  creating: false,
  busySlotId: null,
  error: null,
  actionError: null,
  notice: null,
  clinicSaving: false,
  clinicError: null,
};

// ── Time helpers ────────────────────────────

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/**
 * The slots a range produces. Today's slots that start too soon to book are
 * dropped here, so one early time does not make the server refuse the whole
 * request — the server still re-checks every one.
 */
export function buildRangeSlots(
  date: string,
  rangeStart: string,
  rangeEnd: string,
  duration: number,
): { startTime: string; endTime: string }[] {
  const start = toMinutes(rangeStart);
  const end = toMinutes(rangeEnd);
  if (!(end > start) || duration <= 0) return [];

  const today = todayLocalISODate();
  const now = new Date();
  const earliest = date === today ? now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES : -1;

  const out: { startTime: string; endTime: string }[] = [];
  for (let t = start; t + duration <= end; t += duration) {
    if (t <= earliest) continue;
    out.push({ startTime: fromMinutes(t), endTime: fromMinutes(t + duration) });
  }
  return out;
}

// ── Async Thunks ────────────────────────────

/** Doctor-created clinic. */
export const addClinic = createAsyncThunk<Clinic, ClinicInput, { rejectValue: string }>(
  'manageSlots/addClinic',
  async (input, { rejectWithValue }) => {
    try {
      const res = await createClinicApi(input);
      if (!res.success) return rejectWithValue(res.message ?? 'Could not add clinic');
      return res.data;
    } catch {
      return rejectWithValue('Could not add clinic');
    }
  },
);

export const removeClinic = createAsyncThunk<string, string, { rejectValue: string }>(
  'manageSlots/removeClinic',
  async (clinicId, { rejectWithValue }) => {
    try {
      const res = await deleteClinicApi(clinicId);
      if (!res.success) return rejectWithValue(res.message ?? 'Could not remove clinic');
      return clinicId;
    } catch {
      return rejectWithValue('Could not remove clinic');
    }
  },
);

export const fetchSlots = createAsyncThunk<
  { slots: DoctorSlot[]; clinics: Clinic[] },
  { date?: string } | undefined,
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>('manageSlots/fetchSlots', async (params, { getState, rejectWithValue }) => {
  try {
    const date = params?.date ?? getState().manageSlots.selectedDate;
    const res = await fetchManageSlotsApi(date);
    if (!res.success) return rejectWithValue(res.message ?? 'Could not load slots');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load time slots');
  }
});

/** Create every slot the current range describes. Resolves to how many were requested. */
export const createSlotsFromRange = createAsyncThunk<
  number,
  void,
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>('manageSlots/createSlotsFromRange', async (_, { getState, dispatch, rejectWithValue }) => {
  const s = getState().manageSlots;

  if (s.newSlotType !== 'video' && !s.selectedClinic) {
    return rejectWithValue('Choose a clinic for in-clinic slots, or switch the type to Video.');
  }
  const times = buildRangeSlots(s.selectedDate, s.rangeStart, s.rangeEnd, s.slotDuration);
  if (times.length === 0) {
    return rejectWithValue('No slots fit that time range. Widen it, or pick a later date.');
  }

  const inputs: NewSlotInput[] = times.map((t) => ({
    date: s.selectedDate,
    startTime: t.startTime,
    endTime: t.endTime,
    type: s.newSlotType,
    clinicId: s.newSlotType === 'video' ? null : s.selectedClinic,
    maxPatients: s.maxPatientsPerSlot,
  }));

  try {
    const res = await createDoctorSlotsApi(inputs);
    if (!res.success) return rejectWithValue(res.message ?? 'Could not add slots');
    await dispatch(fetchSlots());
    return inputs.length * (s.newSlotType === 'both' ? 2 : 1);
  } catch {
    return rejectWithValue('Could not add slots');
  }
});

export const editSlot = createAsyncThunk<
  string,
  { slotId: string; edit: SlotEdit; notice?: string },
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>('manageSlots/editSlot', async ({ slotId, edit, notice }, { dispatch, rejectWithValue }) => {
  try {
    const res = await updateDoctorSlotApi(slotId, edit);
    // Refetch either way: a refusal usually means the slot changed underneath
    // the doctor (a patient just booked it), and the grid should say so.
    await dispatch(fetchSlots());
    if (!res.success) return rejectWithValue(res.message ?? 'Could not update the slot');
    return notice ?? 'Slot updated';
  } catch {
    return rejectWithValue('Could not update the slot');
  }
});

export const deleteSlot = createAsyncThunk<
  string,
  string,
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>(
  'manageSlots/deleteSlot',
  async (slotId, { dispatch, rejectWithValue }) => {
    try {
      const res = await deleteDoctorSlotApi(slotId);
      await dispatch(fetchSlots());
      if (!res.success) return rejectWithValue(res.message ?? 'Could not delete the slot');
      // The server says whether it deleted or, for a weekly-schedule slot, closed it.
      return res.message || 'Slot deleted';
    } catch {
      return rejectWithValue('Could not delete the slot');
    }
  },
);

/** Approve or decline a patient's request for a slot, then refresh the day. */
export const respondToRequest = createAsyncThunk<
  string,
  { slotId: string; appointmentId: string; approve: boolean },
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>('manageSlots/respondToRequest', async ({ appointmentId, approve }, { dispatch, rejectWithValue }) => {
  try {
    const res = approve
      ? await approveAppointmentApi(appointmentId)
      : await declineAppointmentApi(appointmentId);
    await dispatch(fetchSlots());
    if (!res.success) {
      return rejectWithValue(res.message ?? (approve ? 'Could not approve the request' : 'Could not decline the request'));
    }
    return approve ? 'Request approved — the slot is now booked' : 'Request declined — the slot is open again';
  } catch {
    return rejectWithValue(approve ? 'Could not approve the request' : 'Could not decline the request');
  }
});

// ── Slice ───────────────────────────────────

const manageSlotsSlice = createSlice({
  name: 'manageSlots',
  initialState,
  reducers: {
    clearClinicError(state) {
      state.clinicError = null;
    },
    clearMessages(state) {
      state.actionError = null;
      state.notice = null;
    },
    setSelectedClinic(state, action: PayloadAction<string | null>) {
      state.selectedClinic = action.payload;
    },
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
      state.actionError = null;
    },
    setSlotDuration(state, action: PayloadAction<SlotDuration>) {
      state.slotDuration = action.payload;
    },
    setMaxPatientsPerSlot(state, action: PayloadAction<number>) {
      state.maxPatientsPerSlot = Math.max(1, Math.min(action.payload, 10));
    },
    setNewSlotType(state, action: PayloadAction<NewSlotType>) {
      state.newSlotType = action.payload;
      state.actionError = null;
    },
    /** Move the range start; the end is pushed along so the range never inverts. */
    setRangeStart(state, action: PayloadAction<string>) {
      state.rangeStart = action.payload;
      if (toMinutes(state.rangeEnd) <= toMinutes(action.payload)) {
        state.rangeEnd = fromMinutes(Math.min(toMinutes(action.payload) + state.slotDuration, 24 * 60 - 1));
      }
    },
    setRangeEnd(state, action: PayloadAction<string>) {
      if (toMinutes(action.payload) > toMinutes(state.rangeStart)) {
        state.rangeEnd = action.payload;
      }
    },
    resetManageSlots() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSlots.fulfilled, (state, action) => {
        state.loading = false;
        state.slots = action.payload.slots;
        state.clinics = action.payload.clinics;
        const stillExists = state.clinics.some((c) => c.clinicId === state.selectedClinic);
        if (!stillExists) state.selectedClinic = state.clinics[0]?.clinicId ?? null;
      })
      .addCase(fetchSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Could not load slots';
      })

      .addCase(createSlotsFromRange.pending, (state) => {
        state.creating = true;
        state.actionError = null;
        state.notice = null;
      })
      .addCase(createSlotsFromRange.fulfilled, (state, action) => {
        state.creating = false;
        state.notice = `${action.payload} slot${action.payload === 1 ? '' : 's'} added — patients can book ${action.payload === 1 ? 'it' : 'them'} now`;
      })
      .addCase(createSlotsFromRange.rejected, (state, action) => {
        state.creating = false;
        state.actionError = action.payload ?? 'Could not add slots';
      })

      .addCase(editSlot.pending, (state, action) => {
        state.busySlotId = action.meta.arg.slotId;
        state.actionError = null;
        state.notice = null;
      })
      .addCase(editSlot.fulfilled, (state, action) => {
        state.busySlotId = null;
        state.notice = action.payload;
      })
      .addCase(editSlot.rejected, (state, action) => {
        state.busySlotId = null;
        state.actionError = action.payload ?? 'Could not update the slot';
      })

      .addCase(deleteSlot.pending, (state, action) => {
        state.busySlotId = action.meta.arg;
        state.actionError = null;
        state.notice = null;
      })
      .addCase(deleteSlot.fulfilled, (state, action) => {
        state.busySlotId = null;
        state.notice = action.payload;
      })
      .addCase(deleteSlot.rejected, (state, action) => {
        state.busySlotId = null;
        state.actionError = action.payload ?? 'Could not delete the slot';
      })

      .addCase(respondToRequest.pending, (state, action) => {
        state.busySlotId = action.meta.arg.slotId;
        state.actionError = null;
        state.notice = null;
      })
      .addCase(respondToRequest.fulfilled, (state, action) => {
        state.busySlotId = null;
        state.notice = action.payload;
      })
      .addCase(respondToRequest.rejected, (state, action) => {
        state.busySlotId = null;
        state.actionError = action.payload ?? 'Could not update the request';
      })

      // ── Clinics ──
      .addCase(addClinic.pending, (state) => {
        state.clinicSaving = true;
        state.clinicError = null;
      })
      .addCase(addClinic.fulfilled, (state, action) => {
        state.clinicSaving = false;
        state.clinics.push(action.payload);
        state.selectedClinic = action.payload.clinicId ?? state.selectedClinic;
      })
      .addCase(addClinic.rejected, (state, action) => {
        state.clinicSaving = false;
        state.clinicError = action.payload ?? 'Could not add clinic';
      })
      .addCase(removeClinic.fulfilled, (state, action) => {
        state.clinics = state.clinics.filter((c) => c.clinicId !== action.payload);
        if (state.selectedClinic === action.payload) {
          state.selectedClinic = state.clinics[0]?.clinicId ?? null;
        }
      })
      .addCase(removeClinic.rejected, (state, action) => {
        state.clinicError = action.payload ?? 'Could not remove clinic';
      });
  },
});

export const {
  clearClinicError,
  clearMessages,
  setSelectedClinic,
  setSelectedDate,
  setSlotDuration,
  setMaxPatientsPerSlot,
  setNewSlotType,
  setRangeStart,
  setRangeEnd,
  resetManageSlots,
} = manageSlotsSlice.actions;

export default manageSlotsSlice.reducer;
