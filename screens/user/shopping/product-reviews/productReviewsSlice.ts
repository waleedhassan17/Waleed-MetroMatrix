import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProductReviewsState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: ProductReviewsState = {
  loading: false,
  refreshing: false,
  error: null,
};

const productReviewsSlice = createSlice({
  name: 'productReviews',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetProductReviews() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = productReviewsSlice.actions;
export default productReviewsSlice.reducer;
