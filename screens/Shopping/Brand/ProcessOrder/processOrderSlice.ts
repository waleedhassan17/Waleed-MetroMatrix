import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Order } from '../../../../types/shopping';
import { updateVendorOrderShippingApi } from '../../../../networks/shopping/vendorApi';

export interface ProcessOrderState {
  /**
   * Which order this form belongs to. Without it the slice was a single global
   * form bound to nothing: it never seeded from the order being viewed (so a
   * saved tracking number always rendered as an empty box, which read as the
   * value having been lost on the status change), and whatever was typed for
   * one order was still sitting there when the next one opened.
   */
  orderId: string | null;
  trackingNumber: string;
  carrier: string;
  /** Vendor-private, saved by the shipping endpoint. */
  internalNotes: string;
  /** Goes into statusHistory on a transition — the shopper can read this. */
  customerNote: string;
  saving: boolean;
  error: string | null;
}

const initialState: ProcessOrderState = {
  orderId: null,
  trackingNumber: '',
  // No default courier. This used to be 'Leopards Courier', which presented a
  // guess as a saved value on an input that was never submitted anywhere.
  carrier: '',
  internalNotes: '',
  customerNote: '',
  saving: false,
  error: null,
};

/** Persist tracking / carrier / internal notes without touching the status. */
export const saveShipping = createAsyncThunk(
  'processOrder/saveShipping',
  async (
    payload: { orderId: string; trackingNumber: string; carrier: string; internalNotes: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateVendorOrderShippingApi(payload.orderId, {
        trackingNumber: payload.trackingNumber,
        carrier: payload.carrier,
        internalNotes: payload.internalNotes,
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save shipping details');
    }
  }
);

const processOrderSlice = createSlice({
  name: 'processOrder',
  initialState,
  reducers: {
    /**
     * Seed the form from the order on screen. Re-seeds only when the order
     * actually changes, so a re-render mid-typing cannot overwrite the input
     * the vendor is still filling in.
     */
    hydrateFromOrder(
      state,
      action: PayloadAction<Pick<Order, 'orderId' | 'trackingNumber' | 'carrier' | 'internalNotes'>>
    ) {
      const order = action.payload;
      if (state.orderId === order.orderId) return;
      state.orderId = order.orderId;
      state.trackingNumber = order.trackingNumber ?? '';
      state.carrier = order.carrier ?? '';
      state.internalNotes = order.internalNotes ?? '';
      state.customerNote = '';
      state.error = null;
    },
    setTrackingNumber(state, action: PayloadAction<string>) {
      state.trackingNumber = action.payload;
    },
    setCarrier(state, action: PayloadAction<string>) {
      state.carrier = action.payload;
    },
    setInternalNotes(state, action: PayloadAction<string>) {
      state.internalNotes = action.payload;
    },
    setCustomerNote(state, action: PayloadAction<string>) {
      state.customerNote = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    resetProcessOrder(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveShipping.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveShipping.fulfilled, (state, action) => {
        state.saving = false;
        // Take the server's canonical values back, so a trimmed or cleared
        // field shows what was actually stored.
        state.trackingNumber = action.payload.trackingNumber ?? '';
        state.carrier = action.payload.carrier ?? '';
        state.internalNotes = action.payload.internalNotes ?? '';
      })
      .addCase(saveShipping.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  hydrateFromOrder,
  setTrackingNumber,
  setCarrier,
  setInternalNotes,
  setCustomerNote,
  setSaving,
  resetProcessOrder,
} = processOrderSlice.actions;
export const selectProcessOrder = (state: { processOrder: ProcessOrderState }) => state.processOrder;
export default processOrderSlice.reducer;
