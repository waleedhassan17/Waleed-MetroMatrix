import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProcessOrderState {
  trackingNumber: string;
  carrier: string;
  notes: string;
  saving: boolean;
}

const initialState: ProcessOrderState = {
  trackingNumber: '',
  carrier: 'Leopards Courier',
  notes: '',
  saving: false,
};

const processOrderSlice = createSlice({
  name: 'processOrder',
  initialState,
  reducers: {
    setTrackingNumber(state, action: PayloadAction<string>) {
      state.trackingNumber = action.payload;
    },
    setCarrier(state, action: PayloadAction<string>) {
      state.carrier = action.payload;
    },
    setNotes(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    resetProcessOrder(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { setTrackingNumber, setCarrier, setNotes, setSaving, resetProcessOrder } = processOrderSlice.actions;
export const selectProcessOrder = (state: { processOrder: ProcessOrderState }) => state.processOrder;
export default processOrderSlice.reducer;