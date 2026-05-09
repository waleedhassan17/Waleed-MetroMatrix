import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ReturnRequestState {
  reason: string;
  details: string;
  submitting: boolean;
}

const initialState: ReturnRequestState = {
  reason: 'Size issue',
  details: '',
  submitting: false,
};

const returnRequestSlice = createSlice({
  name: 'returnRequest',
  initialState,
  reducers: {
    setReason(state, action: PayloadAction<string>) { state.reason = action.payload; },
    setDetails(state, action: PayloadAction<string>) { state.details = action.payload; },
    setSubmitting(state, action: PayloadAction<boolean>) { state.submitting = action.payload; },
    resetReturnRequest(state) { Object.assign(state, initialState); },
  },
});

export const { setReason, setDetails, setSubmitting, resetReturnRequest } = returnRequestSlice.actions;
export const selectReturnRequest = (state: { returnRequest: ReturnRequestState }) => state.returnRequest;
export default returnRequestSlice.reducer;