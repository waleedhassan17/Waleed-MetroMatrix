import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchAdminOrderDetailApi,
  forceOrderStatusApi,
  adminRefundOrderApi,
  type AdminOrderView,
} from '../../../../networks/shopping/adminShoppingApi';

export interface AdminShoppingOrderDetailState {
  order: AdminOrderView | null;
  loading: boolean;
  acting: boolean;
  error: string | null;
}

const initialState: AdminShoppingOrderDetailState = {
  order: null,
  loading: false,
  acting: false,
  error: null,
};

export const fetchAdminOrderDetail = createAsyncThunk(
  'adminShoppingOrderDetail/fetch',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const res = await fetchAdminOrderDetailApi(orderId);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load order');
    }
  }
);

// Force-transition — the mandatory reason is written to statusHistory + audit log
export const adminForceStatus = createAsyncThunk(
  'adminShoppingOrderDetail/forceStatus',
  async (
    { orderId, status, reason }: { orderId: string; status: string; reason: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await forceOrderStatusApi(orderId, status, reason);
      await dispatch(fetchAdminOrderDetail(orderId));
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to change status');
    }
  }
);

export const adminRefund = createAsyncThunk(
  'adminShoppingOrderDetail/refund',
  async ({ orderId, reason }: { orderId: string; reason: string }, { dispatch, rejectWithValue }) => {
    try {
      await adminRefundOrderApi(orderId, reason);
      await dispatch(fetchAdminOrderDetail(orderId));
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to refund order');
    }
  }
);

const adminShoppingOrderDetailSlice = createSlice({
  name: 'adminShoppingOrderDetail',
  initialState,
  reducers: {
    clearAdminOrderDetail(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrderDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrderDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.order = action.payload;
      })
      .addCase(fetchAdminOrderDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    [adminForceStatus, adminRefund].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.acting = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.acting = false;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.acting = false;
          state.error = action.payload as string;
        });
    });
  },
});

export const { clearAdminOrderDetail } = adminShoppingOrderDetailSlice.actions;
export const selectAdminShoppingOrderDetail = (state: {
  adminShoppingOrderDetail: AdminShoppingOrderDetailState;
}) => state.adminShoppingOrderDetail;
export default adminShoppingOrderDetailSlice.reducer;
