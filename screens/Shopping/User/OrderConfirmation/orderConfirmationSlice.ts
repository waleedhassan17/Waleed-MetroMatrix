import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderConfirmationState {
  lastOrderId: string | null;
}

const initialState: OrderConfirmationState = {
  lastOrderId: null,
};

const orderConfirmationSlice = createSlice({
  name: 'orderConfirmation',
  initialState,
  reducers: {
    setLastOrderId(state, action: PayloadAction<string>) {
      state.lastOrderId = action.payload;
    },
  },
});

export const { setLastOrderId } = orderConfirmationSlice.actions;
export const selectOrderConfirmation = (state: { orderConfirmation: OrderConfirmationState }) => state.orderConfirmation;
export default orderConfirmationSlice.reducer;