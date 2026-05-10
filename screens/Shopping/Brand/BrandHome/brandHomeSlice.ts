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
}

const initialState: BrandHomeState = {
  kpis: {
    revenue: 286400,
    income: 252032, // revenue minus 12% platform fee
    orders: 84,
    products: 26,
    lowStock: 5,
    activeShipments: 3,
    deliveryRate: 95.4,
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