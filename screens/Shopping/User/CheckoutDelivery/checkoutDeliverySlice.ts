import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchDeliveryOptionsApi } from '../../../../networks/shopping/cartApi';

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

const initialState: CheckoutDeliveryState = {
  deliveryOptions: [],
  selectedOption: null,
  estimatedDelivery: 'Select a delivery option',
  loading: false,
  error: null,
};

/**
 * Tiers and their surcharges live in admin settings and are served by
 * GET /shopping/delivery-options. They used to be a client-side constant with
 * a fake 250ms delay, and the chosen id was sent to POST /checkout but never
 * priced — so the review screen showed a surcharge nobody was charged. The
 * same ids the server hands out here are the ones it will bill for.
 */
export const fetchDeliveryOptions = createAsyncThunk(
  'checkoutDelivery/fetchDeliveryOptions',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchDeliveryOptionsApi();
      if (!res.success) return rejectWithValue('Failed to load delivery options.');
      return res.data as DeliveryOption[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load delivery options.');
    }
  }
);

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
      .addCase(fetchDeliveryOptions.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load delivery options.';
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