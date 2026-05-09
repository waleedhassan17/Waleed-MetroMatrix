import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Order, OrderStatus } from '../../../../types/shopping';
import { SAMPLE_ORDERS } from '../../../../networks/shopping/dummyData';

export interface BrandOrdersState {
  orders: Order[];
  statusFilter: 'all' | OrderStatus;
}

const initialState: BrandOrdersState = {
  orders: SAMPLE_ORDERS,
  statusFilter: 'all',
};

const brandOrdersSlice = createSlice({
  name: 'brandOrders',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<BrandOrdersState['statusFilter']>) {
      state.statusFilter = action.payload;
    },
    updateOrderStatus(state, action: PayloadAction<{ orderId: string; orderStatus: OrderStatus; trackingNumber?: string }>) {
      const order = state.orders.find((item) => item.orderId === action.payload.orderId);
      if (order) {
        order.orderStatus = action.payload.orderStatus;
        if (action.payload.trackingNumber) {
          order.trackingNumber = action.payload.trackingNumber;
        }
      }
    },
  },
});

export const { setStatusFilter, updateOrderStatus } = brandOrdersSlice.actions;
export const selectBrandOrders = (state: { brandOrders: BrandOrdersState }) => state.brandOrders;
export const selectBrandOrderById = (orderId: string) => (state: { brandOrders: BrandOrdersState }) =>
  state.brandOrders.orders.find((order) => order.orderId === orderId) || null;
export default brandOrdersSlice.reducer;