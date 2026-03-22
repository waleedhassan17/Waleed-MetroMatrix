import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchAvailabilitySettingsApi, saveAvailabilitySettingsApi } from '../../../../networks/healthcare/providerApi';

// ── Types ───────────────────────────────────

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface DaySchedule {
  day: Weekday;
  isWorking: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
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
  error: string | null;
  saveSuccess: boolean;
}

const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultWeeklySchedule: DaySchedule[] = [
  { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '14:00' },
  { day: 'Saturday', isWorking: true, startTime: '10:00', endTime: '14:00' },
  { day: 'Sunday', isWorking: false, startTime: '00:00', endTime: '00:00' },
];

const initialState: AvailabilitySettingsState = {
  weeklySchedule: defaultWeeklySchedule,
  vacationDates: [],
  instantBooking: true,
  videoConsultation: true,
  loading: false,
  saving: false,
  error: null,
  saveSuccess: false,
};

// ── Async Thunks ────────────────────────────

export const fetchSettings = createAsyncThunk<
  { weeklySchedule: DaySchedule[]; vacationDates: VacationDate[]; instantBooking: boolean; videoConsultation: boolean },
  void,
  { rejectValue: string }
>('availabilitySettings/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchAvailabilitySettingsApi();
    if (!res.success) return rejectWithValue(res.message ?? 'Unknown error');
    return res.data;
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

// ── Slice ───────────────────────────────────

const availabilitySettingsSlice = createSlice({
  name: 'availabilitySettings',
  initialState,
  reducers: {
    updateWeeklySchedule(state, action: PayloadAction<{ day: Weekday; updates: Partial<Omit<DaySchedule, 'day'>> }>) {
      const idx = state.weeklySchedule.findIndex((s) => s.day === action.payload.day);
      if (idx !== -1) {
        state.weeklySchedule[idx] = { ...state.weeklySchedule[idx], ...action.payload.updates };
        state.saveSuccess = false;
      }
    },
    addVacation(state, action: PayloadAction<Omit<VacationDate, 'id'>>) {
      state.vacationDates.push({
        ...action.payload,
        id: `vac-${Date.now()}`,
      });
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
    },
    resetAvailabilitySettings() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSettings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.weeklySchedule = action.payload.weeklySchedule;
        state.vacationDates = action.payload.vacationDates;
        state.instantBooking = action.payload.instantBooking;
        state.videoConsultation = action.payload.videoConsultation;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // saveSettings
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
      });
  },
});

export const {
  updateWeeklySchedule,
  addVacation,
  removeVacation,
  toggleInstantBooking,
  toggleVideoConsultation,
  clearSaveSuccess,
  resetAvailabilitySettings,
} = availabilitySettingsSlice.actions;

export default availabilitySettingsSlice.reducer;
