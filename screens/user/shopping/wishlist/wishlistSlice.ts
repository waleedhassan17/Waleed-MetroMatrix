import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WishlistState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: WishlistState = {
  loading: false,
  refreshing: false,
  error: null,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
    setRefreshing(state, action: PayloadAction<boolean>) { state.refreshing = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    clearError(state) { state.error = null; },
    resetWishlist() { return initialState; },
  },
});

export const { setLoading, setRefreshing, setError, clearError } = wishlistSlice.actions;
export default wishlistSlice.reducer;
