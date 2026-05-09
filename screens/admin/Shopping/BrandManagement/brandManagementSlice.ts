import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchBrandsApi } from '../../../../networks/shopping/brandApi';
import type { BrandConfig } from '../../../../types/shopping';
import type { RootState } from '../../../../store/store';

export type BrandStatusFilter = 'all' | 'active' | 'inactive';

export interface BrandManagementState {
  brands: BrandConfig[];
  statusFilter: BrandStatusFilter;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

const initialState: BrandManagementState = {
  brands: [],
  statusFilter: 'all',
  searchQuery: '',
  loading: false,
  error: null,
};

// ── Async Thunks ────────────────────────────

export const fetchBrandsAsync = createAsyncThunk(
  'brandManagement/fetchBrands',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchBrandsApi({ page: 1, limit: 100 });
      return response.data || [];
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to fetch brands');
    }
  }
);

// ── Slice ───────────────────────────────────

const brandManagementSlice = createSlice({
  name: 'brandManagement',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<BrandStatusFilter>) {
      state.statusFilter = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    toggleBrandStatus(state, action: PayloadAction<string>) {
      const brand = state.brands.find(b => b.brandId === action.payload);
      if (brand) brand.isActive = !brand.isActive;
    },
    deleteBrand(state, action: PayloadAction<string>) {
      state.brands = state.brands.filter(b => b.brandId !== action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload;
      })
      .addCase(fetchBrandsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch brands';
      });
  },
});

export const {
  setStatusFilter,
  setSearchQuery,
  toggleBrandStatus,
  deleteBrand,
  clearError,
} = brandManagementSlice.actions;

export default brandManagementSlice.reducer;

// ── Selectors ─────────────────────────────────

export const selectBrandManagement = (state: RootState) => state.brandManagement;
export const selectBrands = (state: RootState) => state.brandManagement.brands;
export const selectFilteredBrands = (state: RootState) => {
  const { brands, statusFilter, searchQuery } = state.brandManagement;
  return brands.filter((b: BrandConfig) => {
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active' ? b.isActive : !b.isActive;
    const matchesSearch = !searchQuery
      ? true
      : b.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
};
export const selectStatusFilter = (state: RootState) => state.brandManagement.statusFilter;
export const selectSearchQuery = (state: RootState) => state.brandManagement.searchQuery;
export const selectIsLoading = (state: RootState) => state.brandManagement.loading;
export const selectError = (state: RootState) => state.brandManagement.error;
