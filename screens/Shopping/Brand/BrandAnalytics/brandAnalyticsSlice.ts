import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  totalExpenses: number;     // shipping + returns + ad spend
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
}

// ── Sample Data ─────────────────────────────

const SAMPLE_REVENUE_7D: RevenuePoint[] = [
  { label: 'Mon', revenue: 32400, orders: 12 },
  { label: 'Tue', revenue: 45600, orders: 18 },
  { label: 'Wed', revenue: 38200, orders: 14 },
  { label: 'Thu', revenue: 52800, orders: 22 },
  { label: 'Fri', revenue: 61400, orders: 26 },
  { label: 'Sat', revenue: 78200, orders: 34 },
  { label: 'Sun', revenue: 55800, orders: 21 },
];

const SAMPLE_REVENUE_30D: RevenuePoint[] = [
  { label: 'W1', revenue: 186000, orders: 72 },
  { label: 'W2', revenue: 214000, orders: 86 },
  { label: 'W3', revenue: 198000, orders: 78 },
  { label: 'W4', revenue: 264000, orders: 105 },
];

const SAMPLE_REVENUE_90D: RevenuePoint[] = [
  { label: 'Jan', revenue: 654000, orders: 248 },
  { label: 'Feb', revenue: 720000, orders: 290 },
  { label: 'Mar', revenue: 862000, orders: 341 },
];

const SAMPLE_TOP_PRODUCTS: TopProduct[] = [
  { productId: 'P-1001', name: 'Classic Cotton Shirt', unitsSold: 142, revenue: 354358 },
  { productId: 'P-1006', name: 'Premium Denim Jacket', unitsSold: 98, revenue: 489510 },
  { productId: 'P-1003', name: 'Running Shoe Pro', unitsSold: 86, revenue: 537614 },
  { productId: 'P-1008', name: 'Slim Fit Chinos', unitsSold: 74, revenue: 221926 },
  { productId: 'P-1012', name: 'Leather Belt Classic', unitsSold: 68, revenue: 101932 },
];

const SAMPLE_CATEGORIES: CategoryBreakdown[] = [
  { category: 'Men', revenue: 486000, percentage: 38, color: '#E67E22' },
  { category: 'Women', revenue: 382000, percentage: 30, color: '#3B82F6' },
  { category: 'Shoes', revenue: 204000, percentage: 16, color: '#8B5CF6' },
  { category: 'Accessories', revenue: 128000, percentage: 10, color: '#10B981' },
  { category: 'Kids', revenue: 76000, percentage: 6, color: '#F59E0B' },
];

const buildSummary = (chart: RevenuePoint[]): FinancialSummary => {
  const totalRevenue = chart.reduce((s, p) => s + p.revenue, 0);
  const totalOrders = chart.reduce((s, p) => s + p.orders, 0);
  const platformFee = totalRevenue * 0.12; // 12% platform commission
  const totalIncome = totalRevenue - platformFee;
  const shippingCost = totalOrders * 120;
  const refundsAmount = Math.round(totalRevenue * 0.03); // ~3% returns
  const adSpend = Math.round(totalRevenue * 0.05);
  const totalExpenses = shippingCost + refundsAmount + adSpend;
  const netProfit = totalIncome - totalExpenses;
  return {
    totalRevenue,
    totalIncome,
    totalExpenses,
    netProfit,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    conversionRate: 4.8,
    returnsCount: Math.round(totalOrders * 0.03),
    refundsAmount,
  };
};

const initialState: BrandAnalyticsState = {
  period: '7d',
  summary: buildSummary(SAMPLE_REVENUE_7D),
  revenueChart: SAMPLE_REVENUE_7D,
  topProducts: SAMPLE_TOP_PRODUCTS,
  categoryBreakdown: SAMPLE_CATEGORIES,
  previousPeriodRevenue: 312000,
  loading: false,
};

// ── Slice ───────────────────────────────────

const brandAnalyticsSlice = createSlice({
  name: 'brandAnalytics',
  initialState,
  reducers: {
    setPeriod(state, action: PayloadAction<AnalyticsPeriod>) {
      state.period = action.payload;
      // Swap chart data based on period
      switch (action.payload) {
        case '7d':
          state.revenueChart = SAMPLE_REVENUE_7D;
          state.previousPeriodRevenue = 312000;
          break;
        case '30d':
          state.revenueChart = SAMPLE_REVENUE_30D;
          state.previousPeriodRevenue = 780000;
          break;
        case '90d':
        case 'all':
          state.revenueChart = SAMPLE_REVENUE_90D;
          state.previousPeriodRevenue = 2100000;
          break;
      }
      state.summary = buildSummary(state.revenueChart);
    },
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
