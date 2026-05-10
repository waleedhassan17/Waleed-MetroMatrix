import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MyOrdersItem {
  orderId: string;
  title: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface MyOrdersState {
  orders: MyOrdersItem[];
  statusFilter: 'all' | string;
}

const initialState: MyOrdersState = {
  orders: [
    { orderId: 'ORD-20018', title: 'Classic Cotton Shirt', status: 'processing', total: 6298, createdAt: 'Today' },
    { orderId: 'ORD-20017', title: 'Running Shoe', status: 'shipped', total: 6249, createdAt: 'Yesterday' },
    { orderId: 'ORD-20016', title: 'Slim Fit Trouser', status: 'delivered', total: 4499, createdAt: '2 days ago' },
  ],
  statusFilter: 'all',
};

const myOrdersSlice = createSlice({
  name: 'myOrders',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<MyOrdersState['statusFilter']>) {
      state.statusFilter = action.payload;
    },
    addOrder(state, action: PayloadAction<MyOrdersItem>) {
      state.orders.unshift(action.payload);
    },
  },
});

export const { setStatusFilter, addOrder } = myOrdersSlice.actions;
export const selectMyOrders = (state: { myOrders: MyOrdersState }) => state.myOrders;
export default myOrdersSlice.reducer;