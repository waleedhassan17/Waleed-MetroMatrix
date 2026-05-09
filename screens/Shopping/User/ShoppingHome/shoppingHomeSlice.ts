import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandConfig, Product } from '../../../../types/shopping';
import { fetchBrandsApi } from '../../../../networks/shopping/brandApi';
import { fetchProductsApi } from '../../../../networks/shopping/productApi';
import { SHOPPING_BANNERS } from '../../../../networks/shopping/dummyData';

// ── State Interface ─────────────────────────

export interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  brandId?: string;
  productId?: string;
  link?: string;
}

export interface ShoppingHomeState {
  featuredBrands: BrandConfig[];
  featuredProducts: Product[];
  banners: Banner[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  cacheExpiry: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const initialState: ShoppingHomeState = {
  featuredBrands: [],
  featuredProducts: [],
  banners: SHOPPING_BANNERS as Banner[],
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
  cacheExpiry: CACHE_DURATION,
};

// ── Async Thunks ────────────────────────────

export const fetchHomeData = createAsyncThunk(
  'shoppingHome/fetchHomeData',
  async (forceRefresh: boolean | void, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { shoppingHome: ShoppingHomeState };
      const { lastUpdated, cacheExpiry, featuredBrands, featuredProducts } = state.shoppingHome;

      const now = Date.now();
      const isCacheValid = lastUpdated && (now - lastUpdated) < cacheExpiry;

      if (isCacheValid && !forceRefresh && featuredBrands.length > 0 && featuredProducts.length > 0) {
        return {
          featuredBrands,
          featuredProducts,
          banners: state.shoppingHome.banners,
          fromCache: true,
        };
      }

      const [brandsRes, productsRes] = await Promise.all([
        fetchBrandsApi({ page: 1, limit: 10 }),
        fetchProductsApi({ isFeatured: true, limit: 12 }),
      ]);

      return {
        featuredBrands: brandsRes.success ? brandsRes.data : [],
        featuredProducts: productsRes.success ? productsRes.data : [],
        banners: state.shoppingHome.banners, // banners come from CMS or separate endpoint
        fromCache: false,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection. Please check your network.');
      }
      return rejectWithValue(error.message || 'Failed to load shopping home data.');
    }
  }
);

export const refreshHomeData = createAsyncThunk(
  'shoppingHome/refreshHomeData',
  async (_, { dispatch }) => {
    return dispatch(fetchHomeData(true)).unwrap();
  }
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
    setBanners(state, action: PayloadAction<Banner[]>) {
      state.banners = action.payload;
    },
    clearError(state) {
      state.error = null;
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
        if (!action.payload.fromCache) {
          state.featuredBrands = action.payload.featuredBrands;
          state.featuredProducts = action.payload.featuredProducts;
          state.lastUpdated = Date.now();
        }
      })
      .addCase(fetchHomeData.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload as string;
      })
      .addCase(refreshHomeData.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(refreshHomeData.fulfilled, (state) => {
        state.refreshing = false;
      })
      .addCase(refreshHomeData.rejected, (state) => {
        state.refreshing = false;
      });
  },
});

export const { setFeaturedBrands, setFeaturedProducts, setBanners, clearError } =
  shoppingHomeSlice.actions;

// ── Selectors ───────────────────────────────

export const selectShoppingHome = (state: { shoppingHome: ShoppingHomeState }) => state.shoppingHome;
export const selectFeaturedBrands = (state: { shoppingHome: ShoppingHomeState }) => state.shoppingHome.featuredBrands;
export const selectFeaturedProducts = (state: { shoppingHome: ShoppingHomeState }) => state.shoppingHome.featuredProducts;
export const selectBanners = (state: { shoppingHome: ShoppingHomeState }) => state.shoppingHome.banners;
export const selectShoppingHomeLoading = (state: { shoppingHome: ShoppingHomeState }) => state.shoppingHome.loading;

export default shoppingHomeSlice.reducer;
