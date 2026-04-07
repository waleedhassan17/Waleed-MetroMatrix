import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderHistoryState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: OrderHistoryState = {
  loading: false,
  refreshing: false,
  error: null,
};

const orderHistorySlice = createSlice({
  name: 'orderHistory',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetOrderHistory() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = orderHistorySlice.actions;
export default orderHistorySlice.reducer;
