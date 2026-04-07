// ============================================
// Shopping Home — Redux Slice
// ============================================

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';
import type { HomeBanner } from './shoppingHomeApi';
import { fetchShoppingHomeFeed } from './shoppingHomeApi';
import { mapHomeFeed } from './shoppingHomeModel';

// ── State Interface ─────────────────────────

export interface ShoppingHomeState {
  featuredBrands: BrandConfig[];
  featuredProducts: Product[];
  banners: HomeBanner[];
  categories: Category[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: ShoppingHomeState = {
  featuredBrands: [],
  featuredProducts: [],
  banners: [],
  categories: [],
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
};

// ── Async Thunks ────────────────────────────

export const fetchHomeData = createAsyncThunk(
  'shoppingHome/fetchHomeData',
  async (forceRefresh: boolean | void, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { shoppingHome: ShoppingHomeState };
      const { lastUpdated, featuredBrands, featuredProducts } = state.shoppingHome;

      // Cache for 5 min
      const CACHE_MS = 5 * 60 * 1000;
      const isCacheValid = lastUpdated && Date.now() - lastUpdated < CACHE_MS;

      if (
        isCacheValid &&
        !forceRefresh &&
        featuredBrands.length > 0 &&
        featuredProducts.length > 0
      ) {
        return {
          brands: featuredBrands,
          products: featuredProducts,
          banners: state.shoppingHome.banners,
          categories: state.shoppingHome.categories,
          fromCache: true,
        };
      }

      const raw = await fetchShoppingHomeFeed();
      const mapped = mapHomeFeed(raw);

      return { ...mapped, fromCache: false };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please check your network.');
      }
      return rejectWithValue(error.message || 'Something went wrong. Please try again.');
    }
  },
);

// ── Slice ───────────────────────────────────

const shoppingHomeSlice = createSlice({
  name: 'shoppingHome',
  initialState,
  reducers: {
    setFeaturedBrands(state, action: PayloadAction<BrandConfig[]>) {
      state.featuredBrands = action.payload;
    },
    setFeaturedProducts(state, action: PayloadAction<Product[]>) {
      state.featuredProducts = action.payload;
    },
    setBanners(state, action: PayloadAction<HomeBanner[]>) {
      state.banners = action.payload;
    },
    setCategories(state, action: PayloadAction<Category[]>) {
      state.categories = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    resetShoppingHome() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHomeData.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.featuredBrands = action.payload.brands;
        state.featuredProducts = action.payload.products;
        state.banners = action.payload.banners;
        state.categories = action.payload.categories;
        if (!action.payload.fromCache) {
          state.lastUpdated = Date.now();
        }
      })
      .addCase(fetchHomeData.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Something went wrong';
      });
  },
});

// ── Exports ─────────────────────────────────

export const {
  setFeaturedBrands,
  setFeaturedProducts,
  setBanners,
  setCategories,
  setError,
  clearError,
  resetShoppingHome,
} = shoppingHomeSlice.actions;

export default shoppingHomeSlice.reducer;
