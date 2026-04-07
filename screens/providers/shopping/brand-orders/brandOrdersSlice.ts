import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BrandOrdersState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: BrandOrdersState = {
  loading: false,
  refreshing: false,
  error: null,
};

const brandOrdersSlice = createSlice({
  name: 'brandOrders',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetBrandOrders() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = brandOrdersSlice.actions;
export default brandOrdersSlice.reducer;
