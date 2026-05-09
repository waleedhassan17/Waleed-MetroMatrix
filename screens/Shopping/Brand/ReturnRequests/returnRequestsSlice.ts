import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: ReturnRequestsState = {
  requests: [
    { requestId: 'RR-1', orderId: 'ORD-20016', customerName: 'Maya Noor', reason: 'Size mismatch', refundAmount: 4299, status: 'pending' },
    { requestId: 'RR-2', orderId: 'ORD-20012', customerName: 'Umer Farooq', reason: 'Damaged packaging', refundAmount: 2999, status: 'pending' },
  ],
};

const returnRequestsSlice = createSlice({
  name: 'returnRequests',
  initialState,
  reducers: {
    updateReturnStatus(state, action: PayloadAction<{ requestId: string; status: ReturnRequestItem['status'] }>) {
      const request = state.requests.find((item) => item.requestId === action.payload.requestId);
      if (request) {
        request.status = action.payload.status;
      }
    },
  },
});

export const { updateReturnStatus } = returnRequestsSlice.actions;
export const selectReturnRequests = (state: { returnRequests: ReturnRequestsState }) => state.returnRequests;
export default returnRequestsSlice.reducer;