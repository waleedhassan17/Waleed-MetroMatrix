import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductFilters } from '../../../../models/shopping/types';

export interface ProductListState {
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  filters: ProductFilters;
  page: number;
  hasMore: boolean;
  total: number;
}

const initialState: ProductListState = {
  products: [],
  loading: false,
  refreshing: false,
  error: null,
  filters: {},
  page: 1,
  hasMore: true,
  total: 0,
};

const productListSlice = createSlice({
  name: 'shoppingProductList',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    setProducts(state, action: PayloadAction<Product[]>) { state.products = action.payload; },
    appendProducts(state, action: PayloadAction<Product[]>) { state.products.push(...action.payload); },
    setFilters(state, action: PayloadAction<ProductFilters>) { state.filters = action.payload; },
    setPage(state, action: PayloadAction<number>) { state.page = action.payload; },
    setHasMore(state, action: PayloadAction<boolean>) { state.hasMore = action.payload; },
    setTotal(state, action: PayloadAction<number>) { state.total = action.payload; },
    clearError(state) { state.error = null; },
    resetProductList() { return initialState; },
  },
});

export const {
  setLoading, setRefreshing, setError, setProducts, appendProducts,
  setFilters, setPage, setHasMore, setTotal, clearError, resetProductList,
} = productListSlice.actions;

export default productListSlice.reducer;
