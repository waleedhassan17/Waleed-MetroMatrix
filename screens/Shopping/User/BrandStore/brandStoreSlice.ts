import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { BrandConfig, Product, Category } from '../../../../types/shopping';
import { fetchBrandByIdApi, fetchBrandCategoriesApi } from '../../../../networks/shopping/brandApi';
import { fetchProductsApi } from '../../../../networks/shopping/productApi';

// ── State Interface ─────────────────────────

export interface BrandStoreState {
  brand: BrandConfig | null;
  products: Product[];
  categories: Category[];
  selectedCategory: string | null;
  loading: boolean;
  productsLoading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';
}

const initialState: BrandStoreState = {
  brand: null,
  products: [],
  categories: [],
  selectedCategory: null,
  loading: false,
  productsLoading: false,
  refreshing: false,
  error: null,
  page: 1,
  totalPages: 1,
  hasMore: true,
  sortBy: 'popular',
};

// ── Async Thunks ────────────────────────────

export const fetchBrandStore = createAsyncThunk(
  'brandStore/fetchBrandStore',
  async (brandId: string, { rejectWithValue }) => {
    try {
      const [brandRes, categoriesRes, productsRes] = await Promise.all([
        fetchBrandByIdApi(brandId),
        fetchBrandCategoriesApi(brandId),
        fetchProductsApi({ brandId, limit: 20, sortBy: 'popular' }),
      ]);

      if (!brandRes.success) {
        return rejectWithValue('Brand not found');
      }

      return {
        brand: brandRes.data,
        categories: categoriesRes.success ? categoriesRes.data : [],
        products: productsRes.success ? productsRes.data : [],
        totalPages: productsRes.success ? productsRes.pagination.pages : 1,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Failed to load brand store.');
    }
  }
);

export const fetchBrandProducts = createAsyncThunk(
  'brandStore/fetchBrandProducts',
  async (
    { brandId, page = 1, categoryId, sortBy, refresh = false }:
    { brandId: string; page?: number; categoryId?: string; sortBy?: string; refresh?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetchProductsApi({
        brandId,
        categoryId,
        sortBy: sortBy as any,
        page,
        limit: 20,
      });

      if (!res.success) {
        return rejectWithValue('Failed to fetch products');
      }

      return {
        products: res.data,
        page: res.pagination.page,
        totalPages: res.pagination.pages,
        refresh,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load products.');
    }
  }
);

// ── Slice ───────────────────────────────────

const brandStoreSlice = createSlice({
  name: 'brandStore',
  initialState,
  reducers: {
    setSelectedCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategory = action.payload;
      state.products = [];
      state.page = 1;
      state.hasMore = true;
    },
    setSelectedBrand(state, action: PayloadAction<BrandConfig>) {
      state.brand = action.payload;
    },
    setSortBy(state, action: PayloadAction<BrandStoreState['sortBy']>) {
      state.sortBy = action.payload;
      state.products = [];
      state.page = 1;
      state.hasMore = true;
    },
    resetBrandStore(state) {
      Object.assign(state, initialState);
    },
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
        state.totalPages = action.payload.totalPages;
        state.hasMore = 1 < action.payload.totalPages;
      })
      .addCase(fetchBrandStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchBrandProducts
      .addCase(fetchBrandProducts.pending, (state, action) => {
        if (action.meta.arg.refresh) {
          state.refreshing = true;
        } else {
          state.productsLoading = true;
        }
      })
      .addCase(fetchBrandProducts.fulfilled, (state, action) => {
        state.productsLoading = false;
        state.refreshing = false;
        const { products, page, totalPages, refresh } = action.payload;
        if (refresh || page === 1) {
          state.products = products;
        } else {
          state.products = [...state.products, ...products];
        }
        state.page = page;
        state.totalPages = totalPages;
        state.hasMore = page < totalPages;
      })
      .addCase(fetchBrandProducts.rejected, (state) => {
        state.productsLoading = false;
        state.refreshing = false;
      });
  },
});

export const { setSelectedCategory, setSelectedBrand, setSortBy, resetBrandStore } =
  brandStoreSlice.actions;

// ── Selectors ───────────────────────────────

export const selectBrandStore = (state: { brandStore: BrandStoreState }) => state.brandStore;
export const selectBrandStoreBrand = (state: { brandStore: BrandStoreState }) => state.brandStore.brand;
export const selectBrandStoreProducts = (state: { brandStore: BrandStoreState }) => state.brandStore.products;
export const selectBrandStoreCategories = (state: { brandStore: BrandStoreState }) => state.brandStore.categories;
export const selectBrandStoreSelectedCategory = (state: { brandStore: BrandStoreState }) => state.brandStore.selectedCategory;
export const selectBrandStoreLoading = (state: { brandStore: BrandStoreState }) => state.brandStore.loading;

export default brandStoreSlice.reducer;
