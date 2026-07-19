import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { requestReturnApi } from '../../../../networks/shopping/orderApi';

export interface ReturnRequestState {
  reason: string;
  details: string;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
}

const initialState: ReturnRequestState = {
  reason: 'Size issue',
  details: '',
  submitting: false,
  error: null,
  submitted: false,
};

// Submit the return to the backend (delivered orders only; the server
// enforces the brand's return window)
export const submitReturnRequest = createAsyncThunk(
  'returnRequest/submit',
  async ({ orderId }: { orderId: string }, { getState, rejectWithValue }) => {
    try {
      const { returnRequest } = getState() as { returnRequest: ReturnRequestState };
      const reason = returnRequest.details
        ? `${returnRequest.reason}: ${returnRequest.details}`
        : returnRequest.reason;
      const res = await requestReturnApi(orderId, { reason });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to submit return request');
    }
  }
);

const returnRequestSlice = createSlice({
  name: 'returnRequest',
  initialState,
  reducers: {
    setReason(state, action: PayloadAction<string>) { state.reason = action.payload; },
    setDetails(state, action: PayloadAction<string>) { state.details = action.payload; },
    setSubmitting(state, action: PayloadAction<boolean>) { state.submitting = action.payload; },
    resetReturnRequest(state) { Object.assign(state, initialState); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitReturnRequest.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitReturnRequest.fulfilled, (state) => {
        state.submitting = false;
        state.submitted = true;
      })
      .addCase(submitReturnRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { setReason, setDetails, setSubmitting, resetReturnRequest } = returnRequestSlice.actions;
export const selectReturnRequest = (state: { returnRequest: ReturnRequestState }) => state.returnRequest;
export default returnRequestSlice.reducer;
