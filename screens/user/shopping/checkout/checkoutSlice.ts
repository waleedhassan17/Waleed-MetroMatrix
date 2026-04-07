import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CheckoutState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: CheckoutState = {
  loading: false,
  refreshing: false,
  error: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetCheckout() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = checkoutSlice.actions;
export default checkoutSlice.reducer;
