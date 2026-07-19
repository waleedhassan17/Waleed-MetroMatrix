import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAdminAnalyticsApi,
  type AdminAnalyticsView,
} from '../../../../networks/shopping/adminShoppingApi';

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AdminShoppingAnalyticsState {
  range: AnalyticsRange;
  data: AdminAnalyticsView | null;
  loading: boolean;
  error: string | null;
}

const initialState: AdminShoppingAnalyticsState = {
  range: '30d',
  data: null,
  loading: false,
  error: null,
};

const RANGE_DAYS: Record<AnalyticsRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

export const fetchAdminShoppingAnalytics = createAsyncThunk(
  'adminShoppingAnalytics/fetch',
  async (range: AnalyticsRange, { rejectWithValue }) => {
    try {
      const to = new Date();
      const from = new Date(to.getTime() - RANGE_DAYS[range] * 86400000);
      const res = await fetchAdminAnalyticsApi({ from: from.toISOString(), to: to.toISOString() });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load analytics');
    }
  }
);

const adminShoppingAnalyticsSlice = createSlice({
  name: 'adminShoppingAnalytics',
  initialState,
  reducers: {
    setAnalyticsRange(state, action: PayloadAction<AnalyticsRange>) {
      state.range = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminShoppingAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminShoppingAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAdminShoppingAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAnalyticsRange } = adminShoppingAnalyticsSlice.actions;
export const selectAdminShoppingAnalytics = (state: {
  adminShoppingAnalytics: AdminShoppingAnalyticsState;
}) => state.adminShoppingAnalytics;
export default adminShoppingAnalyticsSlice.reducer;
