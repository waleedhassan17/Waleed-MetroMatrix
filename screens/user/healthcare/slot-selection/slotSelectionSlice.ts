import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { TimeSlot } from '../../../../models/healthcare/types';
import type { RootState } from '../../../../store/store';
import { fetchTimeSlotsApi } from '../../../../networks/healthcare/appointmentApi';

// ── Types ───────────────────────────────────

export type ConsultationType = 'in-clinic' | 'video';

export interface SlotSelectionState {
  selectedDate: string;
  availableSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  consultationType: ConsultationType;
  loading: boolean;
  error: string | null;
}

// ── Helpers ─────────────────────────────────

const todayISO = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// ── Initial State ───────────────────────────

const initialState: SlotSelectionState = {
  selectedDate: todayISO(),
  availableSlots: [],
  selectedSlot: null,
  consultationType: 'in-clinic',
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

interface FetchSlotsParams {
  doctorId: string;
  date: string;
  consultationType: ConsultationType;
}

export const fetchSlots = createAsyncThunk<
  TimeSlot[],
  FetchSlotsParams,
  { rejectValue: string }
>('slotSelection/fetchSlots', async ({ doctorId, date, consultationType }, { rejectWithValue }) => {
  try {
    const res = await fetchTimeSlotsApi({ doctorId, date });
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data.filter(
      (s) =>
        s.appointmentType === consultationType || s.appointmentType === 'both',
    );
  } catch {
    return rejectWithValue('Something went wrong');
  }
});

// ── Slice ───────────────────────────────────

const slotSelectionSlice = createSlice({
  name: 'slotSelection',
  initialState,
  reducers: {
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
      state.selectedSlot = null;
    },
    setSelectedSlot(state, action: PayloadAction<TimeSlot | null>) {
      state.selectedSlot = action.payload;
    },
    setConsultationType(state, action: PayloadAction<ConsultationType>) {
      state.consultationType = action.payload;
      state.selectedSlot = null;
    },
    clearSelection(state) {
      state.selectedDate = todayISO();
      state.availableSlots = [];
      state.selectedSlot = null;
      state.consultationType = 'in-clinic';
      state.loading = false;
      state.error = null;
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
        state.availableSlots = action.payload;
      })
      .addCase(fetchSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load slots';
      });
  },
});

export const {
  setSelectedDate,
  setSelectedSlot,
  setConsultationType,
  clearSelection,
} = slotSelectionSlice.actions;

// ── Selectors ───────────────────────────────

export const selectSlotsByPeriod = (state: RootState) => {
  const slots = state.slotSelection.availableSlots.filter((s) => s.isAvailable);

  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];

  for (const s of slots) {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    if (hour < 12) morning.push(s);
    else if (hour < 17) afternoon.push(s);
    else evening.push(s);
  }

  return { morning, afternoon, evening };
};

export default slotSelectionSlice.reducer;
