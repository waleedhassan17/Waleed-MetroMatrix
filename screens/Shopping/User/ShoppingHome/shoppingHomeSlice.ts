import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandConfig, Product } from '../../../../types/shopping';
import { fetchBrandsApi } from '../../../../networks/shopping/brandApi';
import { fetchProductsApi } from '../../../../networks/shopping/productApi';
import { fetchBannersApi } from '../../../../networks/shopping/bannerApi';

// ── State Interface ─────────────────────────

/**
 * Promo banners are server rows (GET /shopping/banners), not a bundled
 * fixture. The server only returns banners that are active, inside their date
 * window, and whose brand is still live — so anything here is safe to tap.
 */
export interface Banner {
  bannerId: string;
  image: string;
  title: string;
  subtitle?: string;
  brandId?: string | null;
  productId?: string | null;
}

export interface ShoppingHomeState {
  featuredBrands: BrandConfig[];
  featuredProducts: Product[];
  banners: Banner[];
  /**
   * Which storefront `featuredProducts` was loaded for (null = the brand
   * chooser, i.e. all brands). The cache is keyed on this: without it,
   * entering Cougar after Outfitters would serve Outfitters' products from a
   * still-valid cache.
   */
  cachedBrandId: string | null;
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
  banners: [],
  cachedBrandId: null,
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
      const state = getState() as {
        shoppingHome: ShoppingHomeState;
        brandList: { activeBrand: { brandId: string } | null };
      };
      const { lastUpdated, cacheExpiry, featuredBrands, featuredProducts, cachedBrandId } =
        state.shoppingHome;

      // Inside a storefront this screen IS that brand's shop, so its products
      // must be that brand's. It used to fetch featured products across every
      // brand, which meant the shopper could see — and save — an item that the
      // brand-scoped Wishlist tab then filtered out of sight.
      const brandId = state.brandList?.activeBrand?.brandId ?? null;

      const now = Date.now();
      const isCacheValid =
        lastUpdated && now - lastUpdated < cacheExpiry && cachedBrandId === brandId;

      if (isCacheValid && !forceRefresh && featuredBrands.length > 0 && featuredProducts.length > 0) {
        return {
          featuredBrands,
          featuredProducts,
          banners: state.shoppingHome.banners,
          brandId,
          fromCache: true,
        };
      }

      const [brandsRes, productsRes, bannersRes] = await Promise.all([
        // The brand list itself stays unscoped — it is how a shopper switches.
        fetchBrandsApi({ page: 1, limit: 10 }),
        fetchProductsApi({ isFeatured: true, limit: 12, ...(brandId ? { brandId } : {}) }),
        fetchBannersApi(),
      ]);

      // A `success: false` body used to be flattened to an empty list, so a
      // failing API rendered an empty home screen with no error state.
      if (!brandsRes.success || !productsRes.success) {
        return rejectWithValue('Could not load the storefront. Pull to refresh.');
      }

      return {
        featuredBrands: brandsRes.data,
        featuredProducts: productsRes.data,
        // Banners are decoration: a failure there must not empty the storefront.
        banners: bannersRes.success ? (bannersRes.data as Banner[]) : [],
        brandId,
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
          state.banners = action.payload.banners;
          state.cachedBrandId = action.payload.brandId;
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
