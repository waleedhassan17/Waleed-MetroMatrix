import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchAdminDashboardApi,
  type AdminDashboardView,
} from '../../../../networks/shopping/adminShoppingApi';

export interface AdminShoppingDashboardState {
  data: AdminDashboardView | null;
  loading: boolean;
  error: string | null;
}

const initialState: AdminShoppingDashboardState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchAdminShoppingDashboard = createAsyncThunk(
  'adminShoppingDashboard/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchAdminDashboardApi();
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load dashboard');
    }
  }
);

const adminShoppingDashboardSlice = createSlice({
  name: 'adminShoppingDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminShoppingDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminShoppingDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAdminShoppingDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const selectAdminShoppingDashboard = (state: { adminShoppingDashboard: AdminShoppingDashboardState }) =>
  state.adminShoppingDashboard;
export default adminShoppingDashboardSlice.reducer;
