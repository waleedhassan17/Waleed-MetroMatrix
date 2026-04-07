import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BrandHomeState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: BrandHomeState = {
  loading: false,
  refreshing: false,
  error: null,
};

const brandHomeSlice = createSlice({
  name: 'brandHome',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetBrandHome() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = brandHomeSlice.actions;
export default brandHomeSlice.reducer;
