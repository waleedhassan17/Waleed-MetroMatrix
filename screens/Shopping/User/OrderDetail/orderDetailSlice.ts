import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchOrderGroupByIdApi,
  cancelOrderApi,
} from '../../../../networks/shopping/orderApi';
import type { OrderGroupView } from '../../../../types/shopping';

export interface OrderDetailState {
  group: OrderGroupView | null;
  loading: boolean;
  error: string | null;
  cancelling: string | null; // orderId being cancelled
}

const initialState: OrderDetailState = {
  group: null,
  loading: false,
  error: null,
  cancelling: null,
};

export const fetchOrderDetail = createAsyncThunk(
  'orderDetail/fetch',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const res = await fetchOrderGroupByIdApi(orderId);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load order');
    }
  }
);

// Cancels ONE per-brand sub-order (allowed while pending/confirmed)
export const cancelSubOrder = createAsyncThunk(
  'orderDetail/cancel',
  async ({ orderId, reason }: { orderId: string; reason?: string }, { dispatch, getState, rejectWithValue }) => {
    try {
      await cancelOrderApi(orderId, reason);
      const { orderDetail } = getState() as { orderDetail: OrderDetailState };
      if (orderDetail.group) {
        await dispatch(fetchOrderDetail(orderDetail.group.groupId));
      }
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel order');
    }
  }
);

const orderDetailSlice = createSlice({
  name: 'orderDetail',
  initialState,
  reducers: {
    clearOrderDetail(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.group = action.payload;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(cancelSubOrder.pending, (state, action) => {
        state.cancelling = action.meta.arg.orderId;
        state.error = null;
      })
      .addCase(cancelSubOrder.fulfilled, (state) => {
        state.cancelling = null;
      })
      .addCase(cancelSubOrder.rejected, (state, action) => {
        state.cancelling = null;
        state.error = action.payload as string;
      });
  },
});

export const { clearOrderDetail } = orderDetailSlice.actions;
export const selectOrderDetail = (state: { orderDetail: OrderDetailState }) => state.orderDetail;
export default orderDetailSlice.reducer;
