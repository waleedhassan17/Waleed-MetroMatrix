// ============================================
// Brand Store — Redux Slice (with Thunks)
// ============================================

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';
import { fetchBrandStoreData, fetchBrandProducts } from './brandStoreApi';
import { mapBrandStore } from './brandStoreModel';

export type BrandStoreSortOption = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest';

export interface BrandStoreState {
  brand: BrandConfig | null;
  products: Product[];
  categories: Category[];
  selectedCategoryId: string | null;
  sortBy: BrandStoreSortOption;
  loading: boolean;
  loadingProducts: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  totalProducts: number;
}

const initialState: BrandStoreState = {
  brand: null,
  products: [],
  categories: [],
  selectedCategoryId: null,
  sortBy: 'relevance',
  loading: false,
  loadingProducts: false,
  loadingMore: false,
  refreshing: false,
  error: null,
  page: 1,
  hasMore: true,
  totalProducts: 0,
};

// ── Thunks ──────────────────────────────────

export const fetchBrandStore = createAsyncThunk(
  'brandStore/fetchBrandStore',
  async (brandId: string, { rejectWithValue }) => {
    try {
      const raw = await fetchBrandStoreData(brandId);
      const mapped = mapBrandStore(raw);

      // Also fetch first page of products
      const productsRes = await fetchBrandProducts({ brandId, page: 1, limit: 10 });

      return { ...mapped, products: productsRes.products, totalProducts: productsRes.total, hasMore: productsRes.hasMore };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load brand store');
    }
  },
);

export const fetchFilteredProducts = createAsyncThunk(
  'brandStore/fetchFilteredProducts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { brandStore: BrandStoreState };
      const { brand, selectedCategoryId, sortBy } = state.brandStore;
      if (!brand) return rejectWithValue('No brand selected');

      const res = await fetchBrandProducts({
        brandId: brand.brandId,
        categoryId: selectedCategoryId || undefined,
        sortBy,
        page: 1,
        limit: 10,
      });
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load products');
    }
  },
);

export const loadMoreProducts = createAsyncThunk(
  'brandStore/loadMoreProducts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { brandStore: BrandStoreState };
      const { brand, selectedCategoryId, sortBy, page, hasMore } = state.brandStore;
      if (!brand || !hasMore) return null;

      const res = await fetchBrandProducts({
        brandId: brand.brandId,
        categoryId: selectedCategoryId || undefined,
        sortBy,
        page: page + 1,
        limit: 10,
      });
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load more');
    }
  },
);

// ── Slice ───────────────────────────────────

const brandStoreSlice = createSlice({
  name: 'brandStore',
  initialState,
  reducers: {
    setSelectedBrand(state, action: PayloadAction<BrandConfig>) {
      state.brand = action.payload;
    },
    clearSelectedBrand(state) {
      state.brand = null;
    },
    setSelectedCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategoryId = action.payload;
      state.page = 1;
    },
    setSortBy(state, action: PayloadAction<BrandStoreSortOption>) {
      state.sortBy = action.payload;
      state.page = 1;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) { state.error = null; },
    resetBrandStore() { return initialState; },
  },
  extraReducers: (builder) => {
    builder
      // fetchBrandStore
      .addCase(fetchBrandStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandStore.fulfilled, (state, action) => {
        state.loading = false;
        state.brand = action.payload.brand;
        state.categories = action.payload.categories;
        state.products = action.payload.products;
        state.totalProducts = action.payload.totalProducts;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(fetchBrandStore.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Something went wrong';
      })
      // fetchFilteredProducts
      .addCase(fetchFilteredProducts.pending, (state) => {
        state.loadingProducts = true;
      })
      .addCase(fetchFilteredProducts.fulfilled, (state, action) => {
        state.loadingProducts = false;
        state.products = action.payload.products;
        state.totalProducts = action.payload.total;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(fetchFilteredProducts.rejected, (state) => {
        state.loadingProducts = false;
      })
      // loadMoreProducts
      .addCase(loadMoreProducts.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(loadMoreProducts.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (action.payload) {
          state.products.push(...action.payload.products);
          state.page = action.payload.page;
          state.hasMore = action.payload.hasMore;
        }
      })
      .addCase(loadMoreProducts.rejected, (state) => {
        state.loadingMore = false;
      });
  },
});

export const {
  setSelectedBrand,
  clearSelectedBrand,
  setSelectedCategory,
  setSortBy,
  setError,
  clearError,
  resetBrandStore,
} = brandStoreSlice.actions;

export default brandStoreSlice.reducer;
