import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchVendorReturnsApi,
  updateVendorReturnApi,
} from '../../../../networks/shopping/vendorApi';

// Kept as the backend's own vocabulary — 'pending'/'approved'/'rejected'
// alone can't represent picked_up/refunded, and collapsing them made the
// UI unable to show or gate those states at all.
export type ReturnServerStatus = 'requested' | 'approved' | 'rejected' | 'picked_up' | 'refunded';

export interface ReturnRequestItem {
  requestId: string;
  orderId: string;
  customerName: string;
  reason: string;
  refundAmount: number;
  status: ReturnServerStatus;
}

export interface ReturnRequestsState {
  requests: ReturnRequestItem[];
  loading: boolean;
  error: string | null;
}

const initialState: ReturnRequestsState = {
  requests: [],
  loading: false,
  error: null,
};

export const fetchReturnRequests = createAsyncThunk(
  'returnRequests/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchVendorReturnsApi({ page: 1, limit: 50 });
      return res.data.map((r: any) => ({
        requestId: r.returnId,
        orderId: r.orderId,
        customerName: r.userId && typeof r.userId === 'object' ? r.userId.name || '' : '',
        reason: r.reason,
        refundAmount: r.refundAmount,
        status: r.status as ReturnServerStatus,
      })) as ReturnRequestItem[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load return requests');
    }
  }
);

export const updateReturnStatus = createAsyncThunk(
  'returnRequests/updateStatus',
  async (
    { requestId, status, vendorNote }: { requestId: string; status: ReturnServerStatus; vendorNote?: string },
    { rejectWithValue }
  ) => {
    try {
      // Apply the server's actual response (refundAmount/status it really
      // set), not just an echo of what was requested — approve/reject can
      // have real money and stock effects the client should never assume.
      const res = await updateVendorReturnApi(requestId, { status, vendorNote });
      return {
        requestId,
        status: res.data.status as ReturnServerStatus,
        refundAmount: res.data.refundAmount,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update return request');
    }
  }
);

const returnRequestsSlice = createSlice({
  name: 'returnRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReturnRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReturnRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchReturnRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateReturnStatus.fulfilled, (state, action) => {
        const request = state.requests.find((item) => item.requestId === action.payload.requestId);
        if (request) {
          request.status = action.payload.status;
          request.refundAmount = action.payload.refundAmount;
        }
      })
      .addCase(updateReturnStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const selectReturnRequests = (state: { returnRequests: ReturnRequestsState }) => state.returnRequests;
export default returnRequestsSlice.reducer;
