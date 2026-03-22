import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Specialty } from '../../../../models/healthcare/types';
import { fetchSpecialtiesApi } from '../../../../networks/healthcare/doctorApi';

// ── State Interface ─────────────────────────

export interface SpecialtyListState {
  specialties: Specialty[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

const initialState: SpecialtyListState = {
  specialties: [],
  searchQuery: '',
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchSpecialties = createAsyncThunk(
  'specialtyList/fetchSpecialties',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchSpecialtiesApi();
      if (res.success) {
        return res.data;
      }
      return rejectWithValue(res.message || 'Failed to fetch specialties');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch specialties');
    }
  }
);

// ── Slice ───────────────────────────────────

const specialtyListSlice = createSlice({
  name: 'specialtyList',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    clearSearch(state) {
      state.searchQuery = '';
    },
    resetSpecialtyList() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
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
        state.error = (action.payload as string) || 'Something went wrong';
      });
  },
});

// ── Selectors ───────────────────────────────

export const selectFilteredSpecialties = (state: { specialtyList: SpecialtyListState }) => {
  const { specialties, searchQuery } = state.specialtyList;
  if (!searchQuery.trim()) return specialties;
  const q = searchQuery.toLowerCase();
  return specialties.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.commonConditions.some((c) => c.toLowerCase().includes(q))
  );
};

// ── Exports ─────────────────────────────────

export const {
  setSearchQuery,
  clearSearch,
  resetSpecialtyList,
} = specialtyListSlice.actions;

export default specialtyListSlice.reducer;
