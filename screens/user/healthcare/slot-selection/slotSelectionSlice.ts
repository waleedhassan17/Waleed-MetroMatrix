import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { TimeSlot } from '../../../../models/healthcare/types';
import type { RootState } from '../../../../store/store';
import {
  fetchTimeSlotsApi,
  fetchAvailabilitySummaryApi,
  type AvailabilityDay,
} from '../../../../networks/healthcare/appointmentApi';
import { toLocalISODate } from '../../../../utils/date/localDate';

// ── Types ───────────────────────────────────

export type ConsultationType = 'in-clinic' | 'video';

export interface SlotSelectionState {
  selectedDate: string;
  availableSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  consultationType: ConsultationType;
  loading: boolean;
  error: string | null;

  /**
   * Which upcoming DATES actually have slots.
   *
   * Without this the date strip is fourteen identical chips and finding
   * availability is guesswork — a patient booking on Monday for a Saturday
   * visit had to tap through every day to discover which held anything. Days
   * absent from this map are rendered disabled.
   */
  availabilityByDate: Record<string, number>;
  summaryLoading: boolean;
  /** Earliest date with availability, for the "next available" shortcut. */
  nextAvailableDate: string | null;
}

// ── Helpers ─────────────────────────────────

const todayISO = () => {
  const d = new Date();
  return toLocalISODate(d);
};

// ── Initial State ───────────────────────────

const initialState: SlotSelectionState = {
  selectedDate: todayISO(),
  availableSlots: [],
  selectedSlot: null,
  consultationType: 'in-clinic',
  loading: false,
  error: null,
  availabilityByDate: {},
  summaryLoading: false,
  nextAvailableDate: null,
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

/**
 * Load which dates in the browsing window have availability.
 *
 * One request for the whole strip rather than one per day — the server answers
 * it with a single indexed aggregation.
 */
export const fetchAvailabilitySummary = createAsyncThunk<
  AvailabilityDay[],
  { doctorId: string; from: string; to: string; consultationType?: ConsultationType },
  { rejectValue: string }
>(
  'slotSelection/fetchAvailabilitySummary',
  async ({ doctorId, from, to, consultationType }, { rejectWithValue }) => {
    try {
      const res = await fetchAvailabilitySummaryApi({
        doctorId,
        from,
        to,
        type: consultationType,
      });
      if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
      return res.data?.days ?? [];
    } catch {
      return rejectWithValue('Something went wrong');
    }
  }
);

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
      state.availabilityByDate = {};
      state.nextAvailableDate = null;
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
      })
      .addCase(fetchAvailabilitySummary.pending, (state) => {
        state.summaryLoading = true;
      })
      .addCase(fetchAvailabilitySummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        const map: Record<string, number> = {};
        for (const day of action.payload) map[day.date] = day.total;
        state.availabilityByDate = map;
        // The server returns days in date order, so the first is the earliest
        // with anything bookable.
        state.nextAvailableDate = action.payload[0]?.date ?? null;
      })
      .addCase(fetchAvailabilitySummary.rejected, (state) => {
        state.summaryLoading = false;
        // Deliberately no error state: if the summary fails, every day stays
        // tappable and the patient simply loses the disabled-day hint. Blocking
        // the screen over a hint would be worse than the hint being missing.
        state.availabilityByDate = {};
        state.nextAvailableDate = null;
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

/** Does this date have anything bookable? Unknown dates read as available so
 *  a failed summary never hides real slots. */
export const selectDateHasAvailability = (state: RootState, date: string): boolean => {
  const map = state.slotSelection.availabilityByDate;
  if (!Object.keys(map).length) return true;
  return (map[date] ?? 0) > 0;
};

export const selectNextAvailableDate = (state: RootState) =>
  state.slotSelection.nextAvailableDate;

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
