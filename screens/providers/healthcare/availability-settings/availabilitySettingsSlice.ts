import { toLocalISODate } from '../../../../utils/date/localDate';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAvailabilitySettingsApi,
  saveAvailabilitySettingsApi,
  generateSlotsApi,
} from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** One continuous working period, e.g. 10:00-14:00. */
export interface TimeRange {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

/**
 * A doctor can be available Online (video) and/or Onsite (in-clinic) on a given
 * day, each with its own hours.
 *
 * `ranges` is a LIST, which is how breaks are expressed: 09:00-13:00 plus
 * 14:00-17:00 is a working day with an hour off at one. The backend has always
 * stored and generated slots from `ranges[]`
 * (Doctor.weeklyAvailability, generateSlotsFromAvailability) — the app was
 * collapsing it to a single start/end, so a doctor could not describe a break
 * and the extra periods the server supported were unreachable.
 */
export interface DayMode {
  enabled: boolean;
  /** Ordered, non-overlapping. Gaps between entries are breaks. */
  ranges: TimeRange[];
  /** Onsite only: which clinic these hours are held at. */
  clinicId?: string | null;
}

export interface DaySchedule {
  day: Weekday;
  isWorking: boolean;
  online: DayMode;
  onsite: DayMode;
}

export interface VacationDate {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason: string;
}

export interface AvailabilitySettingsState {
  weeklySchedule: DaySchedule[];
  vacationDates: VacationDate[];
  instantBooking: boolean;
  videoConsultation: boolean;
  loading: boolean;
  saving: boolean;
  generating: boolean;
  error: string | null;
  saveSuccess: boolean;
  generateSuccess: string | null;
}

const WEEKDAYS: Weekday[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

/**
 * An all-OFF week, used only when the doctor explicitly asks to set one up.
 *
 * This used to be a Mon-Sat 09:00-13:00 + 14:00-17:00 working week, seeded
 * into initialState AND used as the fetch fallback — so a doctor who had never
 * configured availability was shown a full working week that did not exist on
 * the server. Patients could not book those hours, and one Save would have
 * written the fiction back.
 */
const blankDay = (day: Weekday): DaySchedule => ({
  day,
  isWorking: false,
  online: { enabled: false, ranges: [{ startTime: '09:00', endTime: '13:00' }] },
  onsite: { enabled: false, ranges: [{ startTime: '14:00', endTime: '17:00' }], clinicId: null },
});

const blankWeeklySchedule = (): DaySchedule[] => WEEKDAYS.map(blankDay);

const initialState: AvailabilitySettingsState = {
  weeklySchedule: [],
  vacationDates: [],
  instantBooking: true,
  videoConsultation: true,
  loading: false,
  saving: false,
  generating: false,
  error: null,
  saveSuccess: false,
  generateSuccess: null,
};

// Normalise any backend/legacy shape into the online/onsite DaySchedule.
const normaliseDay = (raw: any, fallbackDay: Weekday): DaySchedule => {
  const day: Weekday = raw?.day || fallbackDay;
  const toRanges = (mode: any, fallback: TimeRange): TimeRange[] => {
    // Prefer the server's ranges[]; fall back to a legacy flat start/end.
    const list = Array.isArray(mode?.ranges) ? mode.ranges : [];
    const cleaned = list
      .filter((r: any) => r?.startTime && r?.endTime)
      .map((r: any) => ({ startTime: r.startTime, endTime: r.endTime }));
    if (cleaned.length) return cleaned;
    if (mode?.startTime && mode?.endTime) {
      return [{ startTime: mode.startTime, endTime: mode.endTime }];
    }
    return [fallback];
  };

  if (raw?.online || raw?.onsite) {
    return {
      day,
      isWorking: raw.isWorking ?? true,
      online: {
        enabled: raw.online?.enabled ?? false,
        ranges: toRanges(raw.online, { startTime: '09:00', endTime: '13:00' }),
      },
      onsite: {
        enabled: raw.onsite?.enabled ?? false,
        ranges: toRanges(raw.onsite, { startTime: '14:00', endTime: '17:00' }),
        clinicId: raw.onsite?.clinicId ?? null,
      },
    };
  }
  // Legacy {startTime,endTime} → treat as onsite hours. Built from the blank
  // day and then switched on, so nothing is invented when raw is empty.
  const d = blankDay(day);
  d.isWorking = raw?.isWorking ?? true;
  d.onsite.enabled = d.isWorking;
  if (raw?.startTime && raw?.endTime) {
    d.onsite.ranges = [{ startTime: raw.startTime, endTime: raw.endTime }];
  }
  return d;
};

// ── Async Thunks ────────────────────────────

export const fetchSettings = createAsyncThunk<
  Partial<AvailabilitySettingsState>,
  void,
  { rejectValue: string }
>('availabilitySettings/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchAvailabilitySettingsApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    const data: any = res.data || {};

    // FIELD NAMES: the backend (getAvailability, healthcareDoctorController)
    // returns `weeklyAvailability` and `absentDates`. This read only
    // `weeklySchedule` / `vacationDates`, so the schedule was ALWAYS undefined
    // and fell through to [] — which is why the Availability screen rendered
    // completely blank apart from its Save button. Both spellings are accepted
    // so a legacy payload still loads.
    const rawSchedule = data.weeklyAvailability ?? data.weeklySchedule;

    // An empty result means "never configured", not "nothing to show". Fall
    // back to the all-OFF week so the doctor gets seven rows they can switch
    // on. blankWeeklySchedule is deliberately all-off: seeding a fabricated
    // 09:00-17:00 week would show hours patients cannot actually book.
    const schedule: DaySchedule[] = Array.isArray(rawSchedule) && rawSchedule.length
      ? rawSchedule.map((d: any, i: number) => normaliseDay(d, WEEKDAYS[i % 7]))
      : blankWeeklySchedule();

    return {
      weeklySchedule: schedule,
      vacationDates: data.absentDates ?? data.vacationDates ?? [],
      instantBooking: data.instantBooking ?? true,
      videoConsultation: data.videoConsultation ?? true,
    };
  } catch {
    return rejectWithValue('Failed to load availability settings');
  }
});

export const saveSettings = createAsyncThunk<
  void,
  void,
  { state: { availabilitySettings: AvailabilitySettingsState }; rejectValue: string }
>('availabilitySettings/saveSettings', async (_, { getState, rejectWithValue }) => {
  try {
    const { weeklySchedule, vacationDates, instantBooking, videoConsultation } = getState().availabilitySettings;

    // Never PATCH a schedule the doctor was not shown. While the fetch was
    // reading the wrong field the screen rendered blank with weeklySchedule
    // still [], and the Save button was live — one tap would have written an
    // empty week over real availability and silently unbooked the doctor.
    // The fetch now falls back to a seven-day all-OFF week, so [] here can only
    // mean the load never completed.
    if (!weeklySchedule.length) {
      return rejectWithValue('Availability has not loaded yet — pull to refresh and try again.');
    }

    const res = await saveAvailabilitySettingsApi({ weeklySchedule, vacationDates, instantBooking, videoConsultation });
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
  } catch {
    return rejectWithValue('Failed to save settings');
  }
});

// Generate bookable slots from the saved weekly availability for the next N days.
export const generateSlots = createAsyncThunk<
  string,
  { days?: number; slotDuration?: number } | undefined,
  { rejectValue: string }
>('availabilitySettings/generateSlots', async (opts, { rejectWithValue }) => {
  try {
    const days = opts?.days ?? 30;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);
    const fmt = (d: Date) => toLocalISODate(d);
    const res = await generateSlotsApi({ startDate: fmt(start), endDate: fmt(end), slotDuration: opts?.slotDuration ?? 30 });
    if (!res.success) return rejectWithValue(res.message ?? 'Failed to generate slots');
    return res.message ?? 'Slots generated';
  } catch {
    return rejectWithValue('Failed to generate slots');
  }
});

// ── Slice ───────────────────────────────────

const availabilitySettingsSlice = createSlice({
  name: 'availabilitySettings',
  initialState,
  reducers: {
    /** Explicit, user-initiated. Seeds an all-off week the doctor then edits. */
    seedWeeklySchedule(state) {
      if (state.weeklySchedule.length === 0) {
        state.weeklySchedule = blankWeeklySchedule();
        state.saveSuccess = false;
      }
    },
    toggleDayWorking(state, action: PayloadAction<{ day: Weekday }>) {
      const d = state.weeklySchedule.find((s) => s.day === action.payload.day);
      if (d) {
        d.isWorking = !d.isWorking;
        if (!d.isWorking) { d.online.enabled = false; d.onsite.enabled = false; }
        else { d.online.enabled = true; d.onsite.enabled = true; }
        state.saveSuccess = false;
      }
    },
    toggleDayMode(state, action: PayloadAction<{ day: Weekday; mode: 'online' | 'onsite' }>) {
      const d = state.weeklySchedule.find((s) => s.day === action.payload.day);
      if (d) {
        d[action.payload.mode].enabled = !d[action.payload.mode].enabled;
        d.isWorking = d.online.enabled || d.onsite.enabled;
        state.saveSuccess = false;
      }
    },
    updateDayMode(state, action: PayloadAction<{ day: Weekday; mode: 'online' | 'onsite'; updates: Partial<DayMode> }>) {
      const d = state.weeklySchedule.find((s) => s.day === action.payload.day);
      if (d) {
        d[action.payload.mode] = { ...d[action.payload.mode], ...action.payload.updates };
        state.saveSuccess = false;
      }
    },

    /** Edit one endpoint of one period. */
    updateRange(
      state,
      action: PayloadAction<{
        day: Weekday;
        mode: 'online' | 'onsite';
        index: number;
        field: 'startTime' | 'endTime';
        value: string;
      }>,
    ) {
      const { day, mode, index, field, value } = action.payload;
      const range = state.weeklySchedule.find((s) => s.day === day)?.[mode].ranges[index];
      if (range) {
        range[field] = value;
        state.saveSuccess = false;
      }
    },

    /**
     * Append a period after the last one. This is how a doctor adds a break:
     * 09:00-13:00 then 14:00-17:00 leaves 13:00-14:00 free. Defaults to an
     * hour's gap after the previous period so the intent is obvious.
     */
    addRange(state, action: PayloadAction<{ day: Weekday; mode: 'online' | 'onsite' }>) {
      const m = state.weeklySchedule.find((s) => s.day === action.payload.day)?.[action.payload.mode];
      if (!m) return;
      const last = m.ranges[m.ranges.length - 1];
      const toMin = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
      const toStr = (n: number) =>
        `${String(Math.floor((n % 1440) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
      const start = last ? Math.min(toMin(last.endTime) + 60, 22 * 60) : 9 * 60;
      m.ranges.push({ startTime: toStr(start), endTime: toStr(Math.min(start + 180, 23 * 60)) });
      state.saveSuccess = false;
    },

    /** Remove a period. The last one is kept — a mode with no hours is just off. */
    removeRange(state, action: PayloadAction<{ day: Weekday; mode: 'online' | 'onsite'; index: number }>) {
      const m = state.weeklySchedule.find((s) => s.day === action.payload.day)?.[action.payload.mode];
      if (m && m.ranges.length > 1) {
        m.ranges.splice(action.payload.index, 1);
        state.saveSuccess = false;
      }
    },

    /** Which clinic the onsite hours are held at. */
    setDayClinic(state, action: PayloadAction<{ day: Weekday; clinicId: string | null }>) {
      const d = state.weeklySchedule.find((s) => s.day === action.payload.day);
      if (d) {
        d.onsite.clinicId = action.payload.clinicId;
        state.saveSuccess = false;
      }
    },
    copySchedule(state) {
      const mon = state.weeklySchedule.find(s => s.day === 'Monday');
      if (!mon) return;
      state.weeklySchedule.forEach(s => {
        if (s.day !== 'Saturday' && s.day !== 'Sunday') {
          s.isWorking = mon.isWorking;
          // Deep-copy the ranges, or every weekday would share one array.
          s.online = { ...mon.online, ranges: mon.online.ranges.map((r) => ({ ...r })) };
          s.onsite = { ...mon.onsite, ranges: mon.onsite.ranges.map((r) => ({ ...r })) };
        }
      });
      state.saveSuccess = false;
    },
    addVacation(state, action: PayloadAction<Omit<VacationDate, 'id'>>) {
      state.vacationDates.push({ ...action.payload, id: `vac-${Date.now()}` });
      state.saveSuccess = false;
    },
    removeVacation(state, action: PayloadAction<string>) {
      state.vacationDates = state.vacationDates.filter((v) => v.id !== action.payload);
      state.saveSuccess = false;
    },
    toggleInstantBooking(state) {
      state.instantBooking = !state.instantBooking;
      state.saveSuccess = false;
    },
    toggleVideoConsultation(state) {
      state.videoConsultation = !state.videoConsultation;
      state.saveSuccess = false;
    },
    clearSaveSuccess(state) {
      state.saveSuccess = false;
      state.generateSuccess = null;
    },
    resetAvailabilitySettings() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.weeklySchedule) state.weeklySchedule = action.payload.weeklySchedule;
        if (action.payload.vacationDates) state.vacationDates = action.payload.vacationDates;
        if (action.payload.instantBooking !== undefined) state.instantBooking = action.payload.instantBooking;
        if (action.payload.videoConsultation !== undefined) state.videoConsultation = action.payload.videoConsultation;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      .addCase(saveSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(saveSettings.fulfilled, (state) => {
        state.saving = false;
        state.saveSuccess = true;
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Failed to save';
      })
      .addCase(generateSlots.pending, (state) => {
        state.generating = true;
        state.generateSuccess = null;
        state.error = null;
      })
      .addCase(generateSlots.fulfilled, (state, action) => {
        state.generating = false;
        state.generateSuccess = action.payload;
      })
      .addCase(generateSlots.rejected, (state, action) => {
        state.generating = false;
        state.error = action.payload ?? 'Failed to generate slots';
      });
  },
});

export const {
  seedWeeklySchedule,
  toggleDayWorking,
  toggleDayMode,
  updateDayMode,
  updateRange,
  addRange,
  removeRange,
  setDayClinic,
  copySchedule,
  addVacation,
  removeVacation,
  toggleInstantBooking,
  toggleVideoConsultation,
  clearSaveSuccess,
  resetAvailabilitySettings,
} = availabilitySettingsSlice.actions;

export default availabilitySettingsSlice.reducer;
