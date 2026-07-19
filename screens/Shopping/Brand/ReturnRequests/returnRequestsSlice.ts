import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchVendorReturnsApi,
  updateVendorReturnApi,
} from '../../../../networks/shopping/vendorApi';

export interface ReturnRequestItem {
  requestId: string;
  orderId: string;
  customerName: string;
  reason: string;
  refundAmount: number;
  status: 'pending' | 'approved' | 'rejected';
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

// Server statuses: requested/approved/rejected/picked_up/refunded → screen chips
const toScreenStatus = (status: string): ReturnRequestItem['status'] => {
  if (status === 'requested') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'approved'; // approved / picked_up / refunded all render as approved
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
        status: toScreenStatus(r.status),
      })) as ReturnRequestItem[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load return requests');
    }
  }
);

export const updateReturnStatus = createAsyncThunk(
  'returnRequests/updateStatus',
  async (
    { requestId, status }: { requestId: string; status: ReturnRequestItem['status'] },
    { rejectWithValue }
  ) => {
    try {
      const serverStatus = status === 'pending' ? 'requested' : status;
      await updateVendorReturnApi(requestId, { status: serverStatus });
      return { requestId, status };
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
        if (request) request.status = action.payload.status;
      })
      .addCase(updateReturnStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const selectReturnRequests = (state: { returnRequests: ReturnRequestsState }) => state.returnRequests;
export default returnRequestsSlice.reducer;
