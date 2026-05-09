import { createSlice } from '@reduxjs/toolkit';

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
    orders: number;
    products: number;
    lowStock: number;
  };
  weeklySales: number[];
  recentOrders: BrandOrderSummary[];
  lowStockAlerts: { productId: string; name: string; stock: number }[];
}

const initialState: BrandHomeState = {
  kpis: {
    revenue: 286400,
    orders: 84,
    products: 26,
    lowStock: 5,
  },
  weeklySales: [16, 24, 19, 31, 28, 36, 42],
  recentOrders: [
    { orderId: 'ORD-20018', customerName: 'Ayesha Khan', orderStatus: 'processing', total: 12400, createdAt: 'Today' },
    { orderId: 'ORD-20017', customerName: 'Hassan Ali', orderStatus: 'shipped', total: 8600, createdAt: '1h ago' },
    { orderId: 'ORD-20016', customerName: 'Maya Noor', orderStatus: 'delivered', total: 15650, createdAt: 'Yesterday' },
  ],
  lowStockAlerts: [
    { productId: 'P-1001', name: 'Classic Cotton Shirt - M', stock: 4 },
    { productId: 'P-1002', name: 'Smart Casual Trouser - L', stock: 2 },
    { productId: 'P-1003', name: 'Running Shoe - 42', stock: 1 },
  ],
};

const brandHomeSlice = createSlice({
  name: 'brandHome',
  initialState,
  reducers: {},
});

export const selectBrandHome = (state: { brandHome: BrandHomeState }) => state.brandHome;
export default brandHomeSlice.reducer;