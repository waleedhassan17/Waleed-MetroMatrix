import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Clinic, ClinicTiming } from '../../../../models/healthcare/types';
import { fetchDoctorByIdApi } from '../../../../networks/healthcare/doctorApi';
import type { RootState } from '../../../../store/store';

// ── Types ───────────────────────────────────

export interface ClinicAvailability {
  isOpenNow: boolean;
  todayTiming: ClinicTiming | null;
  nextOpenDay: string | null;
}

export interface ClinicWithAvailability extends Clinic {
  availability: ClinicAvailability;
}

// ── State ───────────────────────────────────

export interface ClinicSelectionState {
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: ClinicSelectionState = {
  clinics: [],
  selectedClinic: null,
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
};

// ── Helpers ─────────────────────────────────

const getTodayName = (): string => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
};

const getDayIndex = (day: string): number => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days.indexOf(day.toLowerCase());
};

const isCurrentlyOpen = (timing: ClinicTiming): boolean => {
  if (!timing.isOpen) return false;
  
  const now = new Date();
  const [openH, openM] = timing.openTime.split(':').map(Number);
  const [closeH, closeM] = timing.closeTime.split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

const getClinicAvailability = (clinic: Clinic): ClinicAvailability => {
  const todayName = getTodayName();
  const todayTiming = clinic.timings?.find(
    (t) => t.day.toLowerCase() === todayName.toLowerCase()
  ) || null;
  
  const isOpenNow = todayTiming ? isCurrentlyOpen(todayTiming) : false;
  
  // Find next open day if closed today
  let nextOpenDay: string | null = null;
  if (!todayTiming?.isOpen && clinic.timings) {
    const todayIndex = getDayIndex(todayName);
    for (let i = 1; i <= 7; i++) {
      const checkIndex = (todayIndex + i) % 7;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const checkDay = days[checkIndex];
      const timing = clinic.timings.find(
        (t) => t.day.toLowerCase() === checkDay.toLowerCase()
      );
      if (timing?.isOpen) {
        nextOpenDay = checkDay;
        break;
      }
    }
  }
  
  return { isOpenNow, todayTiming, nextOpenDay };
};

// ── Async Thunks ────────────────────────────

export const fetchClinics = createAsyncThunk<
  Clinic[],
  string, // doctorId
  { rejectValue: string }
>('clinicSelection/fetchClinics', async (doctorId, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorByIdApi(doctorId);
    
    if (!res.success) {
      return rejectWithValue(res.message ?? 'Failed to load clinics');
    }
    
    return res.data.clinics ?? [];
  } catch (error: any) {
    if (error.message?.includes('Network')) {
      return rejectWithValue('No internet connection. Please check your network.');
    }
    return rejectWithValue('Something went wrong. Please try again.');
  }
});

export const refreshClinics = createAsyncThunk<
  Clinic[],
  string, // doctorId
  { state: RootState; rejectValue: string }
>('clinicSelection/refreshClinics', async (doctorId, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorByIdApi(doctorId);
    
    if (!res.success) {
      return rejectWithValue(res.message ?? 'Failed to refresh clinics');
    }
    
    return res.data.clinics ?? [];
  } catch (error: any) {
    return rejectWithValue('Refresh failed. Please try again.');
  }
});

// ── Slice ───────────────────────────────────

const clinicSelectionSlice = createSlice({
  name: 'clinicSelection',
  initialState,
  reducers: {
    setSelectedClinic(state, action: PayloadAction<Clinic>) {
      state.selectedClinic = action.payload;
    },
    
    clearSelectedClinic(state) {
      state.selectedClinic = null;
    },
    
    clearError(state) {
      state.error = null;
    },
    
    clearClinicSelection() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchClinics
      .addCase(fetchClinics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClinics.fulfilled, (state, action) => {
        state.loading = false;
        state.clinics = action.payload;
        state.lastUpdated = Date.now();
        
        // Auto-select if only one clinic
        if (action.payload.length === 1) {
          state.selectedClinic = action.payload[0];
        }
      })
      .addCase(fetchClinics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load clinics';
      })
      
      // refreshClinics
      .addCase(refreshClinics.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshClinics.fulfilled, (state, action) => {
        state.refreshing = false;
        state.clinics = action.payload;
        state.lastUpdated = Date.now();
        
        // Clear selection if selected clinic no longer exists
        if (state.selectedClinic) {
          const stillExists = action.payload.some(
            (c) => c.clinicId === state.selectedClinic?.clinicId
          );
          if (!stillExists) {
            state.selectedClinic = null;
          }
        }
      })
      .addCase(refreshClinics.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload ?? 'Refresh failed';
      });
  },
});

// ── Actions ─────────────────────────────────

export const {
  setSelectedClinic,
  clearSelectedClinic,
  clearError,
  clearClinicSelection,
} = clinicSelectionSlice.actions;

// ── Selectors ───────────────────────────────

// Get all clinics
export const selectClinics = (state: RootState) => state.clinicSelection.clinics;

// Get selected clinic
export const selectSelectedClinic = (state: RootState) =>
  state.clinicSelection.selectedClinic;

// Get loading state
export const selectIsLoading = (state: RootState) =>
  state.clinicSelection.loading;

// Get refreshing state
export const selectIsRefreshing = (state: RootState) =>
  state.clinicSelection.refreshing;

// Get error
export const selectError = (state: RootState) => state.clinicSelection.error;

// Get clinics with availability info
export const selectClinicsWithAvailability = (
  state: RootState
): ClinicWithAvailability[] => {
  return state.clinicSelection.clinics.map((clinic) => ({
    ...clinic,
    availability: getClinicAvailability(clinic),
  }));
};

// Get open clinics (open now or today)
export const selectOpenClinics = (state: RootState) => {
  const todayName = getTodayName();
  
  return state.clinicSelection.clinics.filter((clinic) => {
    const todayTiming = clinic.timings?.find(
      (t) => t.day.toLowerCase() === todayName.toLowerCase()
    );
    return todayTiming?.isOpen;
  });
};

// Get clinics open now
export const selectClinicsOpenNow = (state: RootState) => {
  const todayName = getTodayName();
  
  return state.clinicSelection.clinics.filter((clinic) => {
    const todayTiming = clinic.timings?.find(
      (t) => t.day.toLowerCase() === todayName.toLowerCase()
    );
    return todayTiming ? isCurrentlyOpen(todayTiming) : false;
  });
};

// Get clinic by ID
export const selectClinicById =
  (clinicId: string) =>
  (state: RootState): Clinic | undefined =>
    state.clinicSelection.clinics.find((c) => c.clinicId === clinicId);

// Get clinics by city
export const selectClinicsByCity =
  (city: string) =>
  (state: RootState): Clinic[] =>
    state.clinicSelection.clinics.filter(
      (c) => c.city.toLowerCase() === city.toLowerCase()
    );

// Get unique cities from clinics
export const selectAvailableCities = (state: RootState): string[] => {
  const cities = state.clinicSelection.clinics.map((c) => c.city);
  return [...new Set(cities)].sort();
};

// Get clinics with specific amenity
export const selectClinicsWithAmenity =
  (amenity: string) =>
  (state: RootState): Clinic[] =>
    state.clinicSelection.clinics.filter((c) =>
      c.amenities?.some(
        (a) => a.toLowerCase().includes(amenity.toLowerCase())
      )
    );

// Check if has selection
export const selectHasSelection = (state: RootState): boolean =>
  state.clinicSelection.selectedClinic !== null;

// Get clinics count
export const selectClinicsCount = (state: RootState): number =>
  state.clinicSelection.clinics.length;

// Check if needs refresh (after 5 minutes)
export const selectNeedsRefresh = (state: RootState): boolean => {
  const lastUpdated = state.clinicSelection.lastUpdated;
  if (!lastUpdated) return true;
  
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - lastUpdated > fiveMinutes;
};

// Get sorted clinics (open first, then by name)
export const selectSortedClinics = (state: RootState): Clinic[] => {
  const todayName = getTodayName();
  
  return [...state.clinicSelection.clinics].sort((a, b) => {
    const aOpen = a.timings?.find(
      (t) => t.day.toLowerCase() === todayName.toLowerCase()
    )?.isOpen;
    const bOpen = b.timings?.find(
      (t) => t.day.toLowerCase() === todayName.toLowerCase()
    )?.isOpen;
    
    // Open clinics first
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
};

export default clinicSelectionSlice.reducer;