import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderDetailState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: OrderDetailState = {
  loading: false,
  refreshing: false,
  error: null,
};

const orderDetailSlice = createSlice({
  name: 'orderDetail',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetOrderDetail() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = orderDetailSlice.actions;
export default orderDetailSlice.reducer;
