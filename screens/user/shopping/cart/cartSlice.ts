import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: CartState = {
  loading: false,
  refreshing: false,
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetCart() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = cartSlice.actions;
export default cartSlice.reducer;
