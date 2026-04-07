import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SearchState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: SearchState = {
  loading: false,
  refreshing: false,
  error: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetSearch() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = searchSlice.actions;
export default searchSlice.reducer;
