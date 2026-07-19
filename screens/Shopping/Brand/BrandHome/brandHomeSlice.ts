import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchVendorDashboardApi } from '../../../../networks/shopping/vendorApi';

type BrandOrderSummary = {
  orderId: string;
  customerName: string;
  orderStatus: string;
  total: number;
  createdAt: string;
};

export interface BrandHomeState {
  kpis: {
    revenue: number;
    income: number;
    orders: number;
    products: number;
    lowStock: number;
    activeShipments: number;
    deliveryRate: number; // percentage
  };
  weeklySales: number[];
  recentOrders: BrandOrderSummary[];
  lowStockAlerts: { productId: string; name: string; stock: number }[];
  loading: boolean;
  error: string | null;
}

const initialState: BrandHomeState = {
  kpis: {
    revenue: 0,
    income: 0,
    orders: 0,
    products: 0,
    lowStock: 0,
    activeShipments: 0,
    deliveryRate: 0,
  },
  weeklySales: [0, 0, 0, 0, 0, 0, 0],
  recentOrders: [],
  lowStockAlerts: [],
  loading: false,
  error: null,
};

const relativeDay = (iso: string): string => {
  const date = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
};

export const fetchBrandDashboard = createAsyncThunk(
  'brandHome/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchVendorDashboardApi();
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load dashboard');
    }
  }
);

const brandHomeSlice = createSlice({
  name: 'brandHome',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandDashboard.fulfilled, (state, action) => {
        const data = action.payload;
        state.loading = false;
        state.kpis = data.kpis;
        state.weeklySales = data.weeklySales;
        state.recentOrders = data.recentOrders.map((order) => ({
          orderId: order.orderId,
          customerName: order.customerName,
          orderStatus: order.orderStatus,
          total: order.total,
          createdAt: relativeDay(order.createdAt),
        }));
        state.lowStockAlerts = data.lowStockAlerts;
      })
      .addCase(fetchBrandDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const selectBrandHome = (state: { brandHome: BrandHomeState }) => state.brandHome;
export default brandHomeSlice.reducer;
