import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchBrandByIdApi, updateBrandApi } from '../../../../networks/shopping/brandApi';
import type { BrandConfig } from '../../../../types/shopping';
import type { RootState } from '../../../../store/store';

export interface EditBrandState {
  brand: BrandConfig | null;
  changes: Partial<BrandConfig>;
  saving: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: EditBrandState = {
  brand: null,
  changes: {},
  saving: false,
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchBrandAsync = createAsyncThunk(
  'editBrand/fetchBrand',
  async (brandId: string, { rejectWithValue }) => {
    try {
      const response = await fetchBrandByIdApi(brandId);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to fetch brand');
    }
  }
);

export const saveBrandAsync = createAsyncThunk(
  'editBrand/saveBrand',
  async (brandId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const changes = state.editBrand.changes;
      const response = await updateBrandApi(brandId, changes);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to update brand');
    }
  }
);

// ── Slice ───────────────────────────────────

const editBrandSlice = createSlice({
  name: 'editBrand',
  initialState,
  reducers: {
    updateBrandField(state, action: PayloadAction<Partial<BrandConfig>>) {
      state.changes = { ...state.changes, ...action.payload };
    },
    clearChanges(state) {
      state.changes = {};
    },
    clearError(state) {
      state.error = null;
    },
    resetEditBrand(state) {
      state.brand = null;
      state.changes = {};
      state.saving = false;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.brand = action.payload;
        state.changes = {};
      })
      .addCase(fetchBrandAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch brand';
      })
      .addCase(saveBrandAsync.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveBrandAsync.fulfilled, (state, action) => {
        state.saving = false;
        state.brand = action.payload;
        state.changes = {};
      })
      .addCase(saveBrandAsync.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Failed to update brand';
      });
  },
});

export const {
  updateBrandField,
  clearChanges,
  clearError,
  resetEditBrand,
} = editBrandSlice.actions;

export default editBrandSlice.reducer;

// ── Selectors ─────────────────────────────────

export const selectEditBrand = (state: RootState) => state.editBrand;
export const selectBrand = (state: RootState) => state.editBrand.brand;
export const selectChanges = (state: RootState) => state.editBrand.changes;
export const selectIsLoading = (state: RootState) => state.editBrand.loading;
export const selectIsSaving = (state: RootState) => state.editBrand.saving;
export const selectError = (state: RootState) => state.editBrand.error;
export const selectHasChanges = (state: RootState) => Object.keys(state.editBrand.changes).length > 0;
