import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BrandAnalyticsState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: BrandAnalyticsState = {
  loading: false,
  refreshing: false,
  error: null,
};

const brandAnalyticsSlice = createSlice({
  name: 'brandAnalytics',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetBrandAnalytics() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = brandAnalyticsSlice.actions;
export default brandAnalyticsSlice.reducer;
