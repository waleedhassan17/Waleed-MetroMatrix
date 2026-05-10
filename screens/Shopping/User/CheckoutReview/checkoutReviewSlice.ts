import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartState } from '../Cart/cartSlice';
import { clearCart } from '../Cart/cartSlice';
import type { CheckoutAddressState } from '../CheckoutAddress/checkoutAddressSlice';
import type { CheckoutDeliveryState } from '../CheckoutDelivery/checkoutDeliverySlice';
import type { CheckoutPaymentState } from '../CheckoutPayment/checkoutPaymentSlice';
import { addOrder } from '../MyOrders/myOrdersSlice';
import { setTrackingData } from '../OrderTracking/orderTrackingSlice';

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
  placing: boolean;
  error: string | null;
}

const initialState: CheckoutReviewState = {
  placing: false,
  error: null,
};

interface RootSlices {
  cart: CartState;
  checkoutAddress: CheckoutAddressState;
  checkoutDelivery: CheckoutDeliveryState;
  checkoutPayment: CheckoutPaymentState;
  checkoutReview: CheckoutReviewState;
}

export const placeOrder = createAsyncThunk(
  'checkoutReview/placeOrder',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const orderId = `ORD-${Date.now()}`;

      const state = getState() as RootSlices;
      const { items, subtotal } = state.cart;
      const delivery = state.checkoutDelivery.selectedOption;
      const total = subtotal + (delivery?.cost ?? 0) - state.cart.couponDiscount;

      // Build title from first item(s)
      const title = items.length > 0
        ? items.map((i) => i.productName).slice(0, 2).join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '')
        : 'Order';

      // Add to My Orders
      dispatch(addOrder({
        orderId,
        title,
        status: 'processing',
        total,
        createdAt: 'Just now',
      }));

      // Initialize order tracking
      const estDelivery = new Date(Date.now() + 5 * 86400000).toLocaleDateString('en-PK', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      dispatch(setTrackingData({
        orderId,
        status: 'confirmed',
        courierName: 'TCS Express',
        trackingNumber: `TCS-${Math.floor(Math.random() * 90000000) + 10000000}`,
        estimatedDelivery: estDelivery,
      }));

      // Clear the cart after successful order placement
      dispatch(clearCart());

      return { orderId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to place order');
    }
  }
);

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

// ── Derived selector that builds the order summary from other slices ──

export const selectCheckoutOrderSummary = createSelector(
  [
    (state: RootSlices) => state.cart,
    (state: RootSlices) => state.checkoutAddress.selectedAddress,
    (state: RootSlices) => state.checkoutDelivery.selectedOption,
    (state: RootSlices) => state.checkoutPayment.selectedMethod,
  ],
  (cart, address, delivery, payment): OrderSummary => {
    const items: OrderSummaryItem[] = cart.items.map((i) => ({
      id: i.itemId,
      name: i.productName,
      quantity: i.quantity,
      price: i.unitPrice,
    }));

    const deliveryAddress = address
      ? `${address.name}, ${address.address}, ${address.area}, ${address.city}`
      : 'No address selected';

    const deliveryOption = delivery
      ? `${delivery.name} · ${delivery.eta}`
      : 'No delivery selected';

    const paymentMethod = payment?.name ?? 'No payment selected';

    const deliveryFee = delivery?.cost ?? 0;

    return {
      items,
      deliveryAddress,
      deliveryOption,
      paymentMethod,
      subtotal: cart.subtotal,
      deliveryFee,
      total: cart.subtotal + deliveryFee - cart.couponDiscount,
    };
  }
);

export const selectCheckoutPlacing = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.placing;
export const selectCheckoutError = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.error;

export default checkoutReviewSlice.reducer;