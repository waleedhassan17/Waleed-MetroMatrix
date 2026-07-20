import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../../../types/shopping';
import { fetchProductsApi, FetchProductsParams } from '../../../../networks/shopping/productApi';

// ── Filter Types ────────────────────────────

export interface ProductFilters {
  minPrice: number | null;
  maxPrice: number | null;
  sizes: string[];
  colors: string[];
  brandId: string | null;
  onSale: boolean;
  inStock: boolean;
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popular';

// ── State Interface ─────────────────────────

export interface ProductListState {
  products: Product[];
  filters: ProductFilters;
  sorting: SortOption;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
  totalResults: number;
  // Context from navigation
  contextBrandId: string | null;
  contextCategoryId: string | null;
  contextGender: string | null;
  contextSearch: string | null;
}

const defaultFilters: ProductFilters = {
  minPrice: null,
  maxPrice: null,
  sizes: [],
  colors: [],
  brandId: null,
  onSale: false,
  inStock: false,
};

const initialState: ProductListState = {
  products: [],
  filters: { ...defaultFilters },
  sorting: 'relevance',
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,
  page: 1,
  totalPages: 1,
  hasMore: true,
  totalResults: 0,
  contextBrandId: null,
  contextCategoryId: null,
  contextGender: null,
  contextSearch: null,
};

// ── Async Thunks ────────────────────────────

export const fetchProducts = createAsyncThunk(
  'productList/fetchProducts',
  async (
    { page = 1, refresh = false }: { page?: number; refresh?: boolean } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { productList: ProductListState };
      const { filters, sorting, contextBrandId, contextCategoryId, contextGender, contextSearch } = state.productList;

      const params: FetchProductsParams = {
        page,
        limit: 20,
        sortBy: sorting === 'relevance' ? 'popular' : sorting,
        brandId: filters.brandId || contextBrandId || undefined,
        categoryId: contextCategoryId || undefined,
        gender: contextGender || undefined,
        search: contextSearch || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        inStock: filters.inStock || undefined,
        isFeatured: undefined,
      };

      const res = await fetchProductsApi(params);

      if (!res.success) {
        return rejectWithValue('Failed to fetch products');
      }

      return {
        products: res.data,
        page: res.pagination.page,
        totalPages: res.pagination.pages,
        total: res.pagination.total,
        refresh,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Failed to load products.');
    }
  }
);

export const loadMore = createAsyncThunk(
  'productList/loadMore',
  async (_, { getState, dispatch }) => {
    const state = getState() as { productList: ProductListState };
    if (state.productList.hasMore && !state.productList.loadingMore) {
      return dispatch(fetchProducts({ page: state.productList.page + 1 })).unwrap();
    }
  }
);

// ── Slice ───────────────────────────────────

const productListSlice = createSlice({
  name: 'productList',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<ProductFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.products = [];
      state.page = 1;
      state.hasMore = true;
    },
    clearFilters(state) {
      state.filters = { ...defaultFilters };
      state.products = [];
      state.page = 1;
      state.hasMore = true;
    },
    setSorting(state, action: PayloadAction<SortOption>) {
      state.sorting = action.payload;
      state.products = [];
      state.page = 1;
      state.hasMore = true;
    },
    setContext(state, action: PayloadAction<{ brandId?: string; categoryId?: string; gender?: string; search?: string }>) {
      state.contextBrandId = action.payload.brandId || null;
      state.contextCategoryId = action.payload.categoryId || null;
      state.contextGender = action.payload.gender || null;
      state.contextSearch = action.payload.search || null;
    },
    resetProductList(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        const isRefresh = action.meta.arg?.refresh;
        if (isRefresh) {
          state.refreshing = true;
        } else if (action.meta.arg?.page && action.meta.arg.page > 1) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;

        const { products, page, totalPages, total, refresh } = action.payload;
        if (refresh || page === 1) {
          state.products = products;
        } else {
          // Deduplicate
          const existingIds = new Set(state.products.map((p) => p.productId));
          const newProducts = products.filter((p: Product) => !existingIds.has(p.productId));
          state.products = [...state.products, ...newProducts];
        }
        state.page = page;
        state.totalPages = totalPages;
        state.totalResults = total;
        state.hasMore = page < totalPages;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setSorting, setContext, resetProductList } =
  productListSlice.actions;

// ── Selectors ───────────────────────────────

export const selectProductList = (state: { productList: ProductListState }) => state.productList;
export const selectProducts = (state: { productList: ProductListState }) => state.productList.products;
export const selectProductFilters = (state: { productList: ProductListState }) => state.productList.filters;
export const selectProductSorting = (state: { productList: ProductListState }) => state.productList.sorting;
export const selectProductListLoading = (state: { productList: ProductListState }) => state.productList.loading;
export const selectActiveFilterCount = (state: { productList: ProductListState }) => {
  const f = state.productList.filters;
  let count = 0;
  if (f.minPrice !== null) count++;
  if (f.maxPrice !== null) count++;
  if (f.sizes.length > 0) count++;
  if (f.colors.length > 0) count++;
  if (f.brandId) count++;
  if (f.onSale) count++;
  if (f.inStock) count++;
  return count;
};

export default productListSlice.reducer;
