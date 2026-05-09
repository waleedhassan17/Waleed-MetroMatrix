import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderSummaryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderSummary {
  items: OrderSummaryItem[];
  deliveryAddress: string;
  deliveryOption: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface CheckoutReviewState {
  orderSummary: OrderSummary;
  placing: boolean;
  error: string | null;
}

const initialState: CheckoutReviewState = {
  orderSummary: {
    items: [
      { id: 'item-1', name: 'Classic Cotton Shirt', quantity: 1, price: 2499 },
      { id: 'item-2', name: 'Sneaker Clean Kit', quantity: 2, price: 899 },
    ],
    deliveryAddress: 'Muhammad Waleed, Gulberg III, Lahore',
    deliveryOption: 'Express · 2-3 days',
    paymentMethod: 'Cash on Delivery (COD)',
    subtotal: 4297,
    deliveryFee: 300,
    total: 4597,
  },
  placing: false,
  error: null,
};

export const placeOrder = createAsyncThunk('checkoutReview/placeOrder', async (_, { rejectWithValue }) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { orderId: `ORD-${Date.now()}` };
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to place order');
  }
});

const checkoutReviewSlice = createSlice({
  name: 'checkoutReview',
  initialState,
  reducers: {
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placing = true;
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state) => {
        state.placing = false;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placing = false;
        state.error = (action.payload as string) || 'Failed to place order';
      });
  },
});

export const { setError, clearError } = checkoutReviewSlice.actions;

export const selectCheckoutOrderSummary = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.orderSummary;
export const selectCheckoutPlacing = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.placing;
export const selectCheckoutError = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.error;

export default checkoutReviewSlice.reducer;