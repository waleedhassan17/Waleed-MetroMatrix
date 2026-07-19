import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchVendorAnalyticsApi } from '../../../../networks/shopping/vendorApi';

// ── Types ───────────────────────────────────

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  image?: string;
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalIncome: number;       // revenue after platform fees
  totalExpenses: number;     // shipping + returns
  netProfit: number;         // income - expenses
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;    // percentage
  returnsCount: number;
  refundsAmount: number;
}

export interface BrandAnalyticsState {
  period: AnalyticsPeriod;
  summary: FinancialSummary;
  revenueChart: RevenuePoint[];
  topProducts: TopProduct[];
  categoryBreakdown: CategoryBreakdown[];
  previousPeriodRevenue: number; // for trend calculation
  loading: boolean;
  error: string | null;
}

const emptySummary: FinancialSummary = {
  totalRevenue: 0,
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  conversionRate: 0,
  returnsCount: 0,
  refundsAmount: 0,
};

const initialState: BrandAnalyticsState = {
  period: '7d',
  summary: emptySummary,
  revenueChart: [],
  topProducts: [],
  categoryBreakdown: [],
  previousPeriodRevenue: 0,
  loading: false,
  error: null,
};

// ── Thunks ──────────────────────────────────

export const fetchBrandAnalytics = createAsyncThunk(
  'brandAnalytics/fetch',
  async (period: AnalyticsPeriod, { rejectWithValue }) => {
    try {
      const res = await fetchVendorAnalyticsApi({ period });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load analytics');
    }
  }
);

// ── Slice ───────────────────────────────────

const brandAnalyticsSlice = createSlice({
  name: 'brandAnalytics',
  initialState,
  reducers: {
    setPeriod(state, action: PayloadAction<AnalyticsPeriod>) {
      state.period = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandAnalytics.fulfilled, (state, action) => {
        const data = action.payload;
        state.loading = false;
        state.summary = data.summary;
        state.revenueChart = data.revenueChart;
        state.topProducts = data.topProducts;
        state.categoryBreakdown = data.categoryBreakdown;
        state.previousPeriodRevenue = data.previousPeriodRevenue;
      })
      .addCase(fetchBrandAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setPeriod } = brandAnalyticsSlice.actions;

// ── Selectors ───────────────────────────────

export const selectBrandAnalytics = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics;
export const selectAnalyticsPeriod = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics.period;
export const selectFinancialSummary = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics.summary;
export const selectRevenueChart = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics.revenueChart;
export const selectTopProducts = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics.topProducts;
export const selectCategoryBreakdown = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics.categoryBreakdown;
export const selectPreviousPeriodRevenue = (state: { brandAnalytics: BrandAnalyticsState }) =>
  state.brandAnalytics.previousPeriodRevenue;

export default brandAnalyticsSlice.reducer;
