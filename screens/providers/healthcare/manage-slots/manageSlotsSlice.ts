import { todayLocalISODate } from '../../../../utils/date/localDate';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TimeSlot, Clinic } from '../../../../models/healthcare/types';
import {
  fetchManageSlotsApi,
  saveSlotsApi,
  createClinicApi,
  deleteClinicApi,
  type ClinicInput,
} from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export type SlotDuration = 15 | 20 | 30;

export interface ManageSlotsState {
  slots: TimeSlot[];
  clinics: Clinic[];
  selectedClinic: string | null;
  selectedDate: string;
  slotDuration: SlotDuration;
  maxPatientsPerSlot: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveSuccess: boolean;
  /** Separate from `saving` so the slot Save button isn't disabled by it. */
  clinicSaving: boolean;
  clinicError: string | null;
}

const todayISO = todayLocalISODate();

const initialState: ManageSlotsState = {
  slots: [],
  clinics: [],
  selectedClinic: null,
  selectedDate: todayISO,
  slotDuration: 30,
  maxPatientsPerSlot: 1,
  loading: false,
  saving: false,
  error: null,
  saveSuccess: false,
  clinicSaving: false,
  clinicError: null,
};

// ── Async Thunks ────────────────────────────

/** Doctor-created clinic. The backend endpoint existed; nothing called it. */
export const addClinic = createAsyncThunk<
  Clinic,
  ClinicInput,
  { rejectValue: string }
>('manageSlots/addClinic', async (input, { rejectWithValue }) => {
  try {
    const res = await createClinicApi(input);
    if (!res.success) return rejectWithValue(res.message ?? 'Could not add clinic');
    return res.data;
  } catch {
    return rejectWithValue('Could not add clinic');
  }
});

export const removeClinic = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('manageSlots/removeClinic', async (clinicId, { rejectWithValue }) => {
  try {
    const res = await deleteClinicApi(clinicId);
    if (!res.success) return rejectWithValue(res.message ?? 'Could not remove clinic');
    return clinicId;
  } catch {
    return rejectWithValue('Could not remove clinic');
  }
});

export const fetchSlots = createAsyncThunk<
  { slots: TimeSlot[]; clinics: Clinic[] },
  { clinicId?: string; date?: string } | undefined,
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>('manageSlots/fetchSlots', async (params, { getState, rejectWithValue }) => {
  try {
    const state = getState().manageSlots;
    const clinicId = params?.clinicId ?? state.selectedClinic ?? '';
    const date = params?.date ?? state.selectedDate;
    const res = await fetchManageSlotsApi(clinicId, date, state.slotDuration, state.maxPatientsPerSlot);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
  } catch {
    return rejectWithValue('Failed to load time slots');
  }
});

export const saveSlots = createAsyncThunk<
  void,
  void,
  { state: { manageSlots: ManageSlotsState }; rejectValue: string }
>('manageSlots/saveSlots', async (_, { getState, rejectWithValue }) => {
  try {
    const res = await saveSlotsApi(getState().manageSlots.slots);
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
  } catch {
    return rejectWithValue('Failed to save time slots');
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
    setSelectedClinic(state, action: PayloadAction<string>) {
      state.selectedClinic = action.payload;
      state.saveSuccess = false;
    },
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
      state.saveSuccess = false;
    },
    setSlotDuration(state, action: PayloadAction<SlotDuration>) {
      state.slotDuration = action.payload;
      state.saveSuccess = false;
    },
    setMaxPatientsPerSlot(state, action: PayloadAction<number>) {
      state.maxPatientsPerSlot = Math.max(1, Math.min(action.payload, 10));
      state.saveSuccess = false;
    },
    toggleSlot(state, action: PayloadAction<string>) {
      const slot = state.slots.find((s) => s.slotId === action.payload);
      if (slot && slot.bookedCount === 0) {
        slot.isAvailable = !slot.isAvailable;
        state.saveSuccess = false;
      }
    },
    toggleAllSlots(state, action: PayloadAction<boolean>) {
      const makeAvailable = action.payload;
      state.slots.forEach(slot => {
        if (slot.bookedCount === 0) {
          slot.isAvailable = makeAvailable;
        }
      });
      state.saveSuccess = false;
    },
    clearSaveSuccess(state) {
      state.saveSuccess = false;
    },
    resetManageSlots() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSlots
      .addCase(fetchSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSlots.fulfilled, (state, action) => {
        state.loading = false;
        state.slots = action.payload.slots;
        state.clinics = action.payload.clinics;
        if (!state.selectedClinic && action.payload.clinics.length > 0) {
          state.selectedClinic = action.payload.clinics[0].clinicId;
        }
      })
      .addCase(fetchSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // saveSlots
      .addCase(saveSlots.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(saveSlots.fulfilled, (state) => {
        state.saving = false;
        state.saveSuccess = true;
      })
      .addCase(saveSlots.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Failed to save';
      })

      // ── Clinics ──
      .addCase(addClinic.pending, (state) => {
        state.clinicSaving = true;
        state.clinicError = null;
      })
      .addCase(addClinic.fulfilled, (state, action) => {
        state.clinicSaving = false;
        state.clinics.push(action.payload);
        // Select it straight away — a doctor who just added a clinic wants to
        // build its slots, not hunt for it in the picker.
        state.selectedClinic = (action.payload as any).clinicId ?? state.selectedClinic;
      })
      .addCase(addClinic.rejected, (state, action) => {
        state.clinicSaving = false;
        state.clinicError = (action.payload as string) ?? 'Could not add clinic';
      })
      .addCase(removeClinic.fulfilled, (state, action) => {
        state.clinics = state.clinics.filter((c) => c.clinicId !== action.payload);
        if (state.selectedClinic === action.payload) {
          state.selectedClinic = state.clinics[0]?.clinicId ?? null;
        }
      })
      .addCase(removeClinic.rejected, (state, action) => {
        state.clinicError = (action.payload as string) ?? 'Could not remove clinic';
      });
  },
});

export const {
  clearClinicError,
  setSelectedClinic,
  setSelectedDate,
  setSlotDuration,
  setMaxPatientsPerSlot,
  toggleSlot,
  toggleAllSlots,
  clearSaveSuccess,
  resetManageSlots,
} = manageSlotsSlice.actions;

export default manageSlotsSlice.reducer;
