import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../store/store';

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
  doctorCount: number;
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
// INITIAL STATE (Dummy Data)
// ============================================

const initialState: SpecialtyManagementState = {
  specialties: [
    {
      id: '1',
      name: 'General Medicine',
      icon: 'medkit',
      description: 'Primary healthcare and general consultations for common illnesses and preventive care.',
      commonConditions: [
        { id: 'c1', name: 'Fever & Flu' },
        { id: 'c2', name: 'Diabetes' },
        { id: 'c3', name: 'Hypertension' },
        { id: 'c4', name: 'Allergies' },
      ],
      isActive: true,
      doctorCount: 45,
      color: '#3B82F6',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Dermatology',
      icon: 'body',
      description: 'Skin, hair, and nail conditions including cosmetic treatments.',
      commonConditions: [
        { id: 'c5', name: 'Acne' },
        { id: 'c6', name: 'Eczema' },
        { id: 'c7', name: 'Psoriasis' },
        { id: 'c8', name: 'Hair Loss' },
      ],
      isActive: true,
      doctorCount: 28,
      color: '#8B5CF6',
      createdAt: '2024-01-15',
    },
    {
      id: '3',
      name: 'Pediatrics',
      icon: 'happy',
      description: 'Medical care for infants, children, and adolescents.',
      commonConditions: [
        { id: 'c9', name: 'Vaccination' },
        { id: 'c10', name: 'Growth Issues' },
        { id: 'c11', name: 'Childhood Infections' },
        { id: 'c12', name: 'Nutrition' },
      ],
      isActive: true,
      doctorCount: 32,
      color: '#10B981',
      createdAt: '2024-02-01',
    },
    {
      id: '4',
      name: 'Orthopedics',
      icon: 'fitness',
      description: 'Bone, joint, and muscle conditions including sports injuries.',
      commonConditions: [
        { id: 'c13', name: 'Fractures' },
        { id: 'c14', name: 'Arthritis' },
        { id: 'c15', name: 'Back Pain' },
        { id: 'c16', name: 'Sports Injuries' },
      ],
      isActive: true,
      doctorCount: 22,
      color: '#F59E0B',
      createdAt: '2024-02-10',
    },
    {
      id: '5',
      name: 'Cardiology',
      icon: 'heart',
      description: 'Heart and cardiovascular system conditions and treatments.',
      commonConditions: [
        { id: 'c17', name: 'Heart Disease' },
        { id: 'c18', name: 'High Blood Pressure' },
        { id: 'c19', name: 'Chest Pain' },
        { id: 'c20', name: 'Arrhythmia' },
      ],
      isActive: true,
      doctorCount: 18,
      color: '#EF4444',
      createdAt: '2024-02-15',
    },
    {
      id: '6',
      name: 'Neurology',
      icon: 'pulse',
      description: 'Brain, spinal cord, and nervous system disorders.',
      commonConditions: [
        { id: 'c21', name: 'Migraine' },
        { id: 'c22', name: 'Epilepsy' },
        { id: 'c23', name: 'Stroke' },
        { id: 'c24', name: 'Neuropathy' },
      ],
      isActive: true,
      doctorCount: 14,
      color: '#6366F1',
      createdAt: '2024-03-01',
    },
    {
      id: '7',
      name: 'Ophthalmology',
      icon: 'eye',
      description: 'Eye care, vision disorders, and surgical procedures.',
      commonConditions: [
        { id: 'c25', name: 'Cataract' },
        { id: 'c26', name: 'Glaucoma' },
        { id: 'c27', name: 'Refractive Errors' },
        { id: 'c28', name: 'Dry Eye' },
      ],
      isActive: false,
      doctorCount: 10,
      color: '#14B8A6',
      createdAt: '2024-03-10',
    },
    {
      id: '8',
      name: 'Gynecology',
      icon: 'woman',
      description: 'Women\'s reproductive health and obstetric care.',
      commonConditions: [
        { id: 'c29', name: 'Pregnancy Care' },
        { id: 'c30', name: 'PCOS' },
        { id: 'c31', name: 'Menstrual Issues' },
        { id: 'c32', name: 'Infertility' },
      ],
      isActive: true,
      doctorCount: 25,
      color: '#EC4899',
      createdAt: '2024-03-15',
    },
  ],
  editingSpecialty: null,
  loading: false,
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
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token');

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 600));
      return initialState.specialties;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch specialties');
    }
  }
);

export const saveSpecialty = createAsyncThunk(
  'specialtyManagement/saveSpecialty',
  async (specialty: EditingSpecialty, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token');

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800));

      if (specialty.id) {
        // Update existing
        const existing = state.specialtyManagement.specialties.find(s => s.id === specialty.id);
        return {
          ...existing!,
          ...specialty,
          updatedAt: new Date().toISOString(),
        } as Specialty;
      } else {
        // Create new
        return {
          ...specialty,
          id: Date.now().toString(),
          isActive: true,
          doctorCount: 0,
          createdAt: new Date().toISOString(),
        } as Specialty;
      }
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
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token');

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 400));

      const specialty = state.specialtyManagement.specialties.find(s => s.id === specialtyId);
      if (!specialty) return rejectWithValue('Specialty not found');

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
      const state = getState() as RootState;
      const token = state.admin.accessToken;
      if (!token) return rejectWithValue('No authentication token');

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
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

export const selectTotalDoctorCount = (state: RootState) =>
  state.specialtyManagement.specialties.reduce((sum, s) => sum + s.doctorCount, 0);

export default specialtyManagementSlice.reducer;
