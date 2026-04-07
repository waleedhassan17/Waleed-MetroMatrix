import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BrandProductsState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: BrandProductsState = {
  loading: false,
  refreshing: false,
  error: null,
};

const brandProductsSlice = createSlice({
  name: 'brandProducts',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetBrandProducts() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = brandProductsSlice.actions;
export default brandProductsSlice.reducer;
