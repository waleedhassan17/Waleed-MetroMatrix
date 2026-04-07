import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProductDetailState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: ProductDetailState = {
  loading: false,
  refreshing: false,
  error: null,
};

const productDetailSlice = createSlice({
  name: 'productDetail',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetProductDetail() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = productDetailSlice.actions;
export default productDetailSlice.reducer;
