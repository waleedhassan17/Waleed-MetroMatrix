import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchOrderGroupsApi } from '../../../../networks/shopping/orderApi';
import type { OrderGroupView } from '../../../../types/shopping';

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
  loading: boolean;
  error: string | null;
}

const initialState: MyOrdersState = {
  orders: [],
  statusFilter: 'all',
  loading: false,
  error: null,
};

const titleFor = (group: OrderGroupView): string => {
  const names = group.orders.flatMap((o) => o.items.map((i) => i.productName));
  if (names.length === 0) return `Order ${group.odexId}`;
  return names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '');
};

// A group's headline status: single child → its status; multiple → the
// least-advanced child so the customer sees what still needs attention.
const STATUS_RANK = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'returned',
  'refunded',
  'cancelled',
];
const statusFor = (group: OrderGroupView): string => {
  if (group.orders.length === 0) return 'pending';
  return [...group.orders].sort(
    (a, b) => STATUS_RANK.indexOf(a.orderStatus) - STATUS_RANK.indexOf(b.orderStatus)
  )[0].orderStatus;
};

export const fetchMyOrders = createAsyncThunk(
  'myOrders/fetch',
  async (status: string | void, { rejectWithValue }) => {
    try {
      const res = await fetchOrderGroupsApi({
        page: 1,
        limit: 50,
        status: status && status !== 'all' ? status : undefined,
      });
      return res.data.map((group) => ({
        orderId: group.groupId,
        title: titleFor(group),
        status: statusFor(group),
        total: group.total,
        createdAt: new Date(group.createdAt).toLocaleDateString('en-PK', {
          month: 'short',
          day: 'numeric',
        }),
      }));
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load your orders');
    }
  }
);

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setStatusFilter, addOrder } = myOrdersSlice.actions;
export const selectMyOrders = (state: { myOrders: MyOrdersState }) => state.myOrders;
export default myOrdersSlice.reducer;
