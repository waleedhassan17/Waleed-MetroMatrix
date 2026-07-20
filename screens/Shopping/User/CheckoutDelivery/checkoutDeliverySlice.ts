import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DeliveryOption {
  id: string;
  name: string;
  eta: string;
  cost: number;
  description: string;
}

export interface CheckoutDeliveryState {
  deliveryOptions: DeliveryOption[];
  selectedOption: DeliveryOption | null;
  estimatedDelivery: string;
  loading: boolean;
  error: string | null;
}

// The backend has no delivery-speed-tier pricing — shipping is a single flat
// per-brand fee it computes at checkout (see cart.shippingFee), and this
// screen's chosen option/id is informational only (never sent to checkoutApi).
// cost stays 0 for every option so nothing here implies a charge the order
// review/payment screens won't actually collect.
const sampleOptions: DeliveryOption[] = [
  { id: 'standard', name: 'Standard', eta: '5-7 days', cost: 0, description: 'Our regular delivery window' },
  { id: 'express', name: 'Express', eta: '2-3 days', cost: 0, description: 'Faster delivery for urgent orders' },
  { id: 'same-day', name: 'Same Day', eta: 'Today', cost: 0, description: 'Available in select cities only' },
];

const initialState: CheckoutDeliveryState = {
  deliveryOptions: [],
  selectedOption: null,
  estimatedDelivery: 'Select a delivery option',
  loading: false,
  error: null,
};

export const fetchDeliveryOptions = createAsyncThunk('checkoutDelivery/fetchDeliveryOptions', async () => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return sampleOptions;
});

const checkoutDeliverySlice = createSlice({
  name: 'checkoutDelivery',
  initialState,
  reducers: {
    setSelectedOption(state, action: PayloadAction<string>) {
      const selected = state.deliveryOptions.find((option) => option.id === action.payload) || null;
      state.selectedOption = selected;
      state.estimatedDelivery = selected ? selected.eta : 'Select a delivery option';
      state.error = null;
    },
    calculateDeliveryFee(state, action: PayloadAction<string>) {
      const selected = state.deliveryOptions.find((option) => option.id === action.payload) || null;
      state.selectedOption = selected;
      state.estimatedDelivery = selected ? selected.eta : 'Select a delivery option';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryOptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeliveryOptions.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryOptions = action.payload;
        state.selectedOption = action.payload[0] || null;
        state.estimatedDelivery = action.payload[0] ? action.payload[0].eta : 'Select a delivery option';
      })
      .addCase(fetchDeliveryOptions.rejected, (state) => {
        state.loading = false;
        state.error = 'Failed to load delivery options.';
      });
  },
});

export const { setSelectedOption, calculateDeliveryFee } = checkoutDeliverySlice.actions;

export const selectCheckoutDeliveryOptions = (state: { checkoutDelivery: CheckoutDeliveryState }) =>
  state.checkoutDelivery.deliveryOptions;
export const selectSelectedCheckoutDeliveryOption = (state: { checkoutDelivery: CheckoutDeliveryState }) =>
  state.checkoutDelivery.selectedOption;
export const selectEstimatedDelivery = (state: { checkoutDelivery: CheckoutDeliveryState }) =>
  state.checkoutDelivery.estimatedDelivery;
export const selectCheckoutDeliveryLoading = (state: { checkoutDelivery: CheckoutDeliveryState }) =>
  state.checkoutDelivery.loading;

export default checkoutDeliverySlice.reducer;