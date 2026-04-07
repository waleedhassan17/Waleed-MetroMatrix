// ============================================
// Brand List — Redux Slice
// ============================================

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandListItem, BrandListParams } from './brandListApi';
import { fetchBrandList } from './brandListApi';

// ── Sort options ────────────────────────────

export type BrandSortOption = 'az' | 'rating' | 'newest' | 'products';

// ── State ───────────────────────────────────

export interface BrandListState {
  brands: BrandListItem[];
  searchQuery: string;
  categoryFilter: string;
  sortBy: BrandSortOption;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  total: number;
}

const initialState: BrandListState = {
  brands: [],
  searchQuery: '',
  categoryFilter: 'All',
  sortBy: 'rating',
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,
  page: 1,
  hasMore: true,
  total: 0,
};

// ── Thunks ──────────────────────────────────

export const fetchBrands = createAsyncThunk(
  'brandList/fetchBrands',
  async (params: BrandListParams | void, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { brandList: BrandListState };
      const { searchQuery, categoryFilter, sortBy } = state.brandList;

      const finalParams: BrandListParams = {
        search: params?.search ?? searchQuery,
        category: params?.category ?? categoryFilter,
        sortBy: params?.sortBy ?? sortBy,
        page: 1,
        limit: 10,
      };

      const data = await fetchBrandList(finalParams);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load brands');
    }
  },
);

export const loadMoreBrands = createAsyncThunk(
  'brandList/loadMoreBrands',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { brandList: BrandListState };
      const { searchQuery, categoryFilter, sortBy, page, hasMore } = state.brandList;

      if (!hasMore) return null;

      const data = await fetchBrandList({
        search: searchQuery,
        category: categoryFilter,
        sortBy,
        page: page + 1,
        limit: 10,
      });

      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load more brands');
    }
  },
);

// ── Slice ───────────────────────────────────

const brandListSlice = createSlice({
  name: 'brandList',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setCategoryFilter(state, action: PayloadAction<string>) {
      state.categoryFilter = action.payload;
      state.page = 1;
    },
    setSortBy(state, action: PayloadAction<BrandSortOption>) {
      state.sortBy = action.payload;
      state.page = 1;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    resetBrandList() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchBrands
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.brands = action.payload.brands;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Something went wrong';
      })
      // loadMoreBrands
      .addCase(loadMoreBrands.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(loadMoreBrands.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (action.payload) {
          state.brands.push(...action.payload.brands);
          state.page = action.payload.page;
          state.hasMore = action.payload.hasMore;
          state.total = action.payload.total;
        }
      })
      .addCase(loadMoreBrands.rejected, (state) => {
        state.loadingMore = false;
      });
  },
});

export const {
  setSearchQuery,
  setCategoryFilter,
  setSortBy,
  setError,
  clearError,
  resetBrandList,
} = brandListSlice.actions;

export default brandListSlice.reducer;
