import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAvailabilitySettingsApi,
  saveAvailabilitySettingsApi,
  generateSlotsApi,
} from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// A doctor can be available Online (video) and/or Onsite (in-clinic) on a given day,
// each with its own consultation hours.
export interface DayMode {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
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

const mkDay = (day: Weekday, isWorking: boolean): DaySchedule => ({
  day,
  isWorking,
  online: { enabled: isWorking, startTime: '09:00', endTime: '13:00' },
  onsite: { enabled: isWorking, startTime: '14:00', endTime: '17:00' },
});

const defaultWeeklySchedule: DaySchedule[] = [
  mkDay('Monday', true),
  mkDay('Tuesday', true),
  mkDay('Wednesday', true),
  mkDay('Thursday', true),
  mkDay('Friday', true),
  mkDay('Saturday', true),
  mkDay('Sunday', false),
];

const initialState: AvailabilitySettingsState = {
  weeklySchedule: defaultWeeklySchedule,
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
  if (raw?.online || raw?.onsite) {
    return {
      day,
      isWorking: raw.isWorking ?? true,
      online: {
        enabled: raw.online?.enabled ?? false,
        startTime: raw.online?.startTime ?? raw.online?.ranges?.[0]?.startTime ?? '09:00',
        endTime: raw.online?.endTime ?? raw.online?.ranges?.[0]?.endTime ?? '13:00',
      },
      onsite: {
        enabled: raw.onsite?.enabled ?? false,
        startTime: raw.onsite?.startTime ?? raw.onsite?.ranges?.[0]?.startTime ?? '14:00',
        endTime: raw.onsite?.endTime ?? raw.onsite?.ranges?.[0]?.endTime ?? '17:00',
      },
    };
  }
  // Legacy {startTime,endTime} → treat as onsite hours.
  const d = mkDay(day, raw?.isWorking ?? true);
  if (raw?.startTime) d.onsite.startTime = raw.startTime;
  if (raw?.endTime) d.onsite.endTime = raw.endTime;
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
    const schedule: DaySchedule[] = Array.isArray(data.weeklySchedule) && data.weeklySchedule.length
      ? data.weeklySchedule.map((d: any, i: number) => normaliseDay(d, defaultWeeklySchedule[i % 7].day))
      : defaultWeeklySchedule;
    return {
      weeklySchedule: schedule,
      vacationDates: data.vacationDates ?? [],
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
    const fmt = (d: Date) => d.toISOString().split('T')[0];
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
  toggleDayWorking,
  toggleDayMode,
  updateDayMode,
  addVacation,
  removeVacation,
  toggleInstantBooking,
  toggleVideoConsultation,
  clearSaveSuccess,
  resetAvailabilitySettings,
} = availabilitySettingsSlice.actions;

export default availabilitySettingsSlice.reducer;
