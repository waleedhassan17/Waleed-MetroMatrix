import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAdminBrandsApi,
  setBrandStatusApi,
  type AdminBrandView,
} from '../../../../networks/shopping/adminShoppingApi';
import { deleteBrandApi } from '../../../../networks/shopping/brandApi';
import type { RootState } from '../../../../store/store';

export type BrandStatusFilter = 'all' | 'pending' | 'active' | 'suspended';

export interface BrandManagementState {
  brands: AdminBrandView[];
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
      const response = await fetchAdminBrandsApi({ page: 1, limit: 100 });
      return response.data || [];
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to fetch brands');
    }
  }
);

// Approve a pending brand / suspend an active one / reactivate. Audited server-side.
export const setBrandStatusAsync = createAsyncThunk(
  'brandManagement/setStatus',
  async (
    { brandId, status, reason }: { brandId: string; status: 'active' | 'suspended' | 'pending'; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await setBrandStatusApi(brandId, status, reason);
      return response.data;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to update brand status');
    }
  }
);

export const deleteBrandAsync = createAsyncThunk(
  'brandManagement/delete',
  async (brandId: string, { rejectWithValue }) => {
    try {
      await deleteBrandApi(brandId);
      return brandId;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to delete brand');
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
      })
      .addCase(setBrandStatusAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.brands.findIndex((b) => b.brandId === updated.brandId);
        if (index !== -1) state.brands[index] = { ...state.brands[index], ...updated };
      })
      .addCase(setBrandStatusAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to update brand status';
      })
      .addCase(deleteBrandAsync.fulfilled, (state, action) => {
        state.brands = state.brands.filter((b) => b.brandId !== action.payload);
      })
      .addCase(deleteBrandAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to delete brand';
      });
  },
});

export const {
  setStatusFilter,
  setSearchQuery,
  clearError,
} = brandManagementSlice.actions;

export default brandManagementSlice.reducer;

// ── Selectors ─────────────────────────────────

export const selectBrandManagement = (state: RootState) => state.brandManagement;
export const selectBrands = (state: RootState) => state.brandManagement.brands;
export const selectFilteredBrands = (state: RootState) => {
  const { brands, statusFilter, searchQuery } = state.brandManagement;
  return brands.filter((b: AdminBrandView) => {
    const matchesStatus = statusFilter === 'all' ? true : b.status === statusFilter;
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
