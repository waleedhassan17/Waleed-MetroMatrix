import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartState } from '../Cart/cartSlice';
import { fetchCart } from '../Cart/cartSlice';
import type { CheckoutAddressState } from '../CheckoutAddress/checkoutAddressSlice';
import type { CheckoutDeliveryState } from '../CheckoutDelivery/checkoutDeliverySlice';
import type { CheckoutPaymentState } from '../CheckoutPayment/checkoutPaymentSlice';
import { addOrder } from '../MyOrders/myOrdersSlice';
import { checkoutApi } from '../../../../networks/shopping/orderApi';

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
      const state = getState() as RootSlices;
      const { items } = state.cart;
      if (items.length === 0) {
        return rejectWithValue('Your cart is empty');
      }

      const address = state.checkoutAddress.selectedAddress;
      if (!address) {
        return rejectWithValue('Please select a delivery address');
      }

      const methodId = state.checkoutPayment.selectedMethod?.id;
      if (methodId !== 'wallet' && methodId !== 'cod') {
        return rejectWithValue('Please select a payment method');
      }

      // Real checkout: server revalidates stock, recomputes totals,
      // splits the cart into one order per brand and takes payment.
      const res = await checkoutApi({
        addressId: address.id,
        paymentMethod: methodId,
      });
      const group = res.data;

      const title = items.length > 0
        ? items.map((i) => i.productName).slice(0, 2).join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '')
        : 'Order';

      // Show immediately in My Orders (server refresh happens on screen focus)
      dispatch(addOrder({
        orderId: group.groupId,
        title,
        status: 'pending',
        total: group.total,
        createdAt: 'Just now',
      }));

      // Server cleared the cart during checkout — sync local state
      dispatch(fetchCart());

      return { orderId: group.groupId };
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

    // The backend has no delivery-speed-tier concept — shipping is a flat
    // per-brand fee it computes itself (see cart.shippingFee). The delivery
    // screen's cost is cosmetic/ETA-only and is never sent to checkoutApi,
    // so the total shown here must be built from the server's real numbers
    // or it will diverge from what actually gets charged.
    return {
      items,
      deliveryAddress,
      deliveryOption,
      paymentMethod,
      subtotal: cart.subtotal,
      deliveryFee: cart.shippingFee,
      total: cart.total,
    };
  }
);

export const selectCheckoutPlacing = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.placing;
export const selectCheckoutError = (state: { checkoutReview: CheckoutReviewState }) =>
  state.checkoutReview.error;

export default checkoutReviewSlice.reducer;