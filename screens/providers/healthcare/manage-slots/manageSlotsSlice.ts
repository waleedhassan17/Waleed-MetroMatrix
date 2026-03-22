import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TimeSlot, Clinic } from '../../../../models/healthcare/types';
import { fetchManageSlotsApi, saveSlotsApi } from '../../../../networks/healthcare/providerApi';

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
}

const todayISO = new Date().toISOString().split('T')[0];

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
};

// ── Async Thunks ────────────────────────────

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
      });
  },
});

export const {
  setSelectedClinic,
  setSelectedDate,
  setSlotDuration,
  setMaxPatientsPerSlot,
  toggleSlot,
  clearSaveSuccess,
  resetManageSlots,
} = manageSlotsSlice.actions;

export default manageSlotsSlice.reducer;
