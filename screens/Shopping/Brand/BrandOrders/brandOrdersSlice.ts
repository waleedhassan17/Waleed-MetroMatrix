import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Order, OrderStatus } from '../../../../types/shopping';
import {
  fetchVendorOrdersApi,
  updateVendorOrderStatusApi,
} from '../../../../networks/shopping/vendorApi';

export interface BrandOrdersState {
  orders: (Order & { customerName?: string })[];
  statusFilter: 'all' | OrderStatus;
  loading: boolean;
  error: string | null;
}

const initialState: BrandOrdersState = {
  orders: [],
  statusFilter: 'all',
  loading: false,
  error: null,
};

export const fetchBrandOrders = createAsyncThunk(
  'brandOrders/fetch',
  async (status: string | void, { rejectWithValue }) => {
    try {
      const res = await fetchVendorOrdersApi({
        page: 1,
        limit: 50,
        status: status && status !== 'all' ? status : undefined,
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load orders');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'brandOrders/updateStatus',
  async (
    {
      orderId,
      orderStatus,
      trackingNumber,
      note,
    }: { orderId: string; orderStatus: OrderStatus; trackingNumber?: string; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateVendorOrderStatusApi(orderId, {
        status: orderStatus,
        trackingNumber,
        note,
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update order status');
    }
  }
);

const brandOrdersSlice = createSlice({
  name: 'brandOrders',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<BrandOrdersState['statusFilter']>) {
      state.statusFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchBrandOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.orders.findIndex((order) => order.orderId === updated.orderId);
        if (index !== -1) {
          state.orders[index] = { ...state.orders[index], ...updated };
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setStatusFilter } = brandOrdersSlice.actions;
export const selectBrandOrders = (state: { brandOrders: BrandOrdersState }) => state.brandOrders;
export const selectBrandOrderById = (orderId: string) => (state: { brandOrders: BrandOrdersState }) =>
  state.brandOrders.orders.find((order) => order.orderId === orderId) || null;
export default brandOrdersSlice.reducer;
