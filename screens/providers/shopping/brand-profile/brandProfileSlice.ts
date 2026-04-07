import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BrandProfileState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: BrandProfileState = {
  loading: false,
  refreshing: false,
  error: null,
};

const brandProfileSlice = createSlice({
  name: 'brandProfile',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetBrandProfile() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = brandProfileSlice.actions;
export default brandProfileSlice.reducer;
