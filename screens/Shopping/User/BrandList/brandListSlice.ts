import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandConfig } from '../../../../types/shopping';
import { fetchBrandsApi } from '../../../../networks/shopping/brandApi';

// ── State Interface ─────────────────────────

export interface BrandListState {
  brands: BrandConfig[];
  searchQuery: string;
  categoryFilter: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const initialState: BrandListState = {
  brands: [],
  searchQuery: '',
  categoryFilter: null,
  loading: false,
  refreshing: false,
  error: null,
  page: 1,
  totalPages: 1,
  hasMore: true,
};

// ── Async Thunks ────────────────────────────

export const fetchBrands = createAsyncThunk(
  'brandList/fetchBrands',
  async (
    { page = 1, refresh = false }: { page?: number; refresh?: boolean } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const res = await fetchBrandsApi({ page, limit: 20 });

      if (!res.success) {
        return rejectWithValue('Failed to fetch brands');
      }

      return {
        brands: res.data,
        page: res.pagination.page,
        totalPages: res.pagination.pages,
        refresh,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Failed to load brands.');
    }
  }
);

// ── Slice ───────────────────────────────────

const brandListSlice = createSlice({
  name: 'brandList',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setCategoryFilter(state, action: PayloadAction<string | null>) {
      state.categoryFilter = action.payload;
    },
    resetBrandList(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state, action) => {
        if (action.meta.arg?.refresh) {
          state.refreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        const { brands, page, totalPages, refresh } = action.payload;
        if (refresh || page === 1) {
          state.brands = brands;
        } else {
          state.brands = [...state.brands, ...brands];
        }
        state.page = page;
        state.totalPages = totalPages;
        state.hasMore = page < totalPages;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, setCategoryFilter, resetBrandList } =
  brandListSlice.actions;

// ── Selectors ───────────────────────────────

export const selectBrandList = (state: { brandList: BrandListState }) => state.brandList;
export const selectBrands = (state: { brandList: BrandListState }) => state.brandList.brands;
export const selectBrandListLoading = (state: { brandList: BrandListState }) => state.brandList.loading;
export const selectBrandSearchQuery = (state: { brandList: BrandListState }) => state.brandList.searchQuery;
export const selectBrandCategoryFilter = (state: { brandList: BrandListState }) => state.brandList.categoryFilter;

export default brandListSlice.reducer;
