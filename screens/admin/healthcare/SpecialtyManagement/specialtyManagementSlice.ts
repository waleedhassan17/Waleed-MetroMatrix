import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../store/store';
import {
  fetchAdminSpecialtiesApi,
  createSpecialtyApi,
  updateSpecialtyApi,
  deleteSpecialtyApi,
  reactivateSpecialtyApi,
} from '../../../../networks/healthcare/adminApi';

// Map a backend specialty (commonConditions: string[]) into this screen's shape.
const SPECIALTY_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#EC4899'];
function toLocalSpecialty(s: any, idx = 0): any {
  return {
    id: s.specialtyId || s.id || s._id,
    name: s.name || '',
    icon: s.icon || 'medkit',
    description: s.description || '',
    commonConditions: (s.commonConditions || []).map((c: any, i: number) =>
      typeof c === 'string' ? { id: `${i}`, name: c } : c
    ),
    isActive: s.isActive !== false,
    // The server counts doctors per specialty; a missing count shows as "—".
    doctorCount: typeof s.doctorCount === 'number' ? s.doctorCount : null,
    color: SPECIALTY_COLORS[idx % SPECIALTY_COLORS.length],
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt,
  };
}

// ============================================
// INTERFACES
// ============================================

interface CommonCondition {
  id: string;
  name: string;
}

export interface Specialty {
  id: string;
  name: string;
  icon: string;
  description: string;
  commonConditions: CommonCondition[];
  isActive: boolean;
  doctorCount: number | null;
  color: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EditingSpecialty {
  id?: string;
  name: string;
  icon: string;
  description: string;
  commonConditions: CommonCondition[];
  color: string;
}

interface SpecialtyManagementState {
  specialties: Specialty[];
  editingSpecialty: EditingSpecialty | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  searchQuery: string;
  filterActive: 'all' | 'active' | 'inactive';
}

// ============================================
// INITIAL STATE
// ============================================

// Empty and loading: nothing is shown until the server has answered. This
// used to ship eight invented specialties with doctor counts, which is what
// the screen displayed when the request failed.
const initialState: SpecialtyManagementState = {
  specialties: [],
  editingSpecialty: null,
  loading: true,
  saving: false,
  error: null,
  searchQuery: '',
  filterActive: 'all',
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchSpecialties = createAsyncThunk(
  'specialtyManagement/fetchSpecialties',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await fetchAdminSpecialtiesApi();
      if (!res.success) return rejectWithValue(res.message || 'Failed to fetch specialties');
      return res.data.map((s: any, i: number) => toLocalSpecialty(s, i));
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch specialties');
    }
  }
);

export const saveSpecialty = createAsyncThunk(
  'specialtyManagement/saveSpecialty',
  async (specialty: EditingSpecialty, { getState, rejectWithValue }) => {
    try {
      const conditions = (specialty.commonConditions || []).map((c) => c.name);
      const payload = {
        name: specialty.name,
        icon: specialty.icon,
        description: specialty.description,
        commonConditions: conditions,
      };
      const res = specialty.id
        ? await updateSpecialtyApi(specialty.id, payload)
        : await createSpecialtyApi(payload);
      if (!res.success) return rejectWithValue(res.message || 'Failed to save specialty');
      const existing = (getState() as RootState).specialtyManagement.specialties.find((s) => s.id === specialty.id);
      return {
        ...toLocalSpecialty(res.data),
        // Preserve UI-only fields the backend doesn't store.
        color: specialty.color || existing?.color || '#3B82F6',
        commonConditions: specialty.commonConditions,
        doctorCount: existing ? existing.doctorCount : null,
      } as Specialty;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to save specialty');
    }
  }
);

export const toggleSpecialtyStatus = createAsyncThunk(
  'specialtyManagement/toggleSpecialtyStatus',
  async (specialtyId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const specialty = state.specialtyManagement.specialties.find(s => s.id === specialtyId);
      if (!specialty) return rejectWithValue('Specialty not found');

      // DELETE deactivates (refused while verified doctors use it); PATCH
      // { isActive: true } reactivates. Both are recorded in the audit log.
      const res = specialty.isActive ? await deleteSpecialtyApi(specialtyId) : await reactivateSpecialtyApi(specialtyId);
      if (!res.success) return rejectWithValue(res.message || 'Could not change the status');
      return { id: specialtyId, isActive: !specialty.isActive };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to toggle status');
    }
  }
);

export const deleteSpecialty = createAsyncThunk(
  'specialtyManagement/deleteSpecialty',
  async (specialtyId: string, { getState, rejectWithValue }) => {
    try {
      const res = await deleteSpecialtyApi(specialtyId);
      if (!res.success) return rejectWithValue(res.message || 'Failed to delete specialty');
      return specialtyId;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to delete specialty');
    }
  }
);

// ============================================
// SLICE
// ============================================

const specialtyManagementSlice = createSlice({
  name: 'specialtyManagement',
  initialState,
  reducers: {
    setEditingSpecialty: (state, action: PayloadAction<EditingSpecialty | null>) => {
      state.editingSpecialty = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilterActive: (state, action: PayloadAction<'all' | 'active' | 'inactive'>) => {
      state.filterActive = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSpecialties
      .addCase(fetchSpecialties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpecialties.fulfilled, (state, action) => {
        state.loading = false;
        state.specialties = action.payload;
      })
      .addCase(fetchSpecialties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // saveSpecialty
      .addCase(saveSpecialty.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveSpecialty.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.specialties.findIndex(s => s.id === action.payload.id);
        if (index >= 0) {
          state.specialties[index] = action.payload;
        } else {
          state.specialties.unshift(action.payload);
        }
        state.editingSpecialty = null;
      })
      .addCase(saveSpecialty.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      // toggleSpecialtyStatus
      .addCase(toggleSpecialtyStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(toggleSpecialtyStatus.fulfilled, (state, action) => {
        const specialty = state.specialties.find(s => s.id === action.payload.id);
        if (specialty) {
          specialty.isActive = action.payload.isActive;
        }
      })
      // deleteSpecialty
      .addCase(deleteSpecialty.fulfilled, (state, action) => {
        state.specialties = state.specialties.filter(s => s.id !== action.payload);
      })
      .addCase(deleteSpecialty.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setEditingSpecialty,
  setSearchQuery,
  setFilterActive,
  clearError,
} = specialtyManagementSlice.actions;

// ============================================
// SELECTORS
// ============================================

export const selectSpecialties = (state: RootState) => state.specialtyManagement.specialties;
export const selectEditingSpecialty = (state: RootState) => state.specialtyManagement.editingSpecialty;
export const selectSpecialtyLoading = (state: RootState) => state.specialtyManagement.loading;
export const selectSpecialtySaving = (state: RootState) => state.specialtyManagement.saving;
export const selectSearchQuery = (state: RootState) => state.specialtyManagement.searchQuery;
export const selectFilterActive = (state: RootState) => state.specialtyManagement.filterActive;

export const selectFilteredSpecialties = (state: RootState) => {
  const { specialties, searchQuery, filterActive } = state.specialtyManagement;
  let filtered = specialties;

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.commonConditions.some(c => c.name.toLowerCase().includes(query))
    );
  }

  if (filterActive === 'active') {
    filtered = filtered.filter(s => s.isActive);
  } else if (filterActive === 'inactive') {
    filtered = filtered.filter(s => !s.isActive);
  }

  return filtered;
};

/** Doctors across specialties; null when the server sent no counts. */
export const selectTotalDoctorCount = (state: RootState): number | null => {
  const counts = state.specialtyManagement.specialties.map((s) => s.doctorCount).filter((n): n is number => typeof n === 'number');
  return counts.length ? counts.reduce((sum, n) => sum + n, 0) : null;
};

export default specialtyManagementSlice.reducer;
