import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAddressesApi,
  createAddressApi,
  updateAddressApi,
  deleteAddressApi,
} from '../../../../networks/shopping/orderApi';
import type { SavedAddressView } from '../../../../types/shopping';

export interface CheckoutAddressForm {
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string;
  landmark: string;
  isDefault: boolean;
}

export interface SavedAddress extends CheckoutAddressForm {
  id: string;
}

export interface CheckoutAddressState {
  savedAddresses: SavedAddress[];
  selectedAddress: SavedAddress | null;
  newAddressForm: CheckoutAddressForm;
  loading: boolean;
  error: string | null;
}

const initialForm: CheckoutAddressForm = {
  name: '',
  phone: '',
  address: '',
  city: '',
  area: '',
  landmark: '',
  isDefault: false,
};

const initialState: CheckoutAddressState = {
  savedAddresses: [],
  selectedAddress: null,
  newAddressForm: { ...initialForm },
  loading: false,
  error: null,
};

// ── Server ↔ form mapping ───────────────────

const fromServer = (a: SavedAddressView & { area?: string; landmark?: string }): SavedAddress => ({
  id: a.addressId,
  name: a.fullName,
  phone: a.phone,
  address: a.addressLine1,
  city: a.city,
  area: a.area || a.addressLine2 || '',
  landmark: a.landmark || '',
  isDefault: a.isDefault,
});

const toServer = (form: Partial<CheckoutAddressForm>) => ({
  fullName: form.name,
  phone: form.phone,
  addressLine1: form.address,
  city: form.city,
  area: form.area,
  landmark: form.landmark,
  isDefault: form.isDefault,
});

// ── Server-backed thunks (same names as the old local actions) ──────

export const fetchAddresses = createAsyncThunk(
  'checkoutAddress/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchAddressesApi();
      return res.data.map(fromServer);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load addresses.');
    }
  }
);

export const addNewAddress = createAsyncThunk(
  'checkoutAddress/addNewAddress',
  async (form: CheckoutAddressForm, { rejectWithValue }) => {
    try {
      const res = await createAddressApi(toServer(form) as any);
      return fromServer(res.data as any);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save address.');
    }
  }
);

export const updateAddress = createAsyncThunk(
  'checkoutAddress/updateAddress',
  async (
    { id, updates }: { id: string; updates: Partial<CheckoutAddressForm> },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateAddressApi(id, toServer(updates) as any);
      return fromServer(res.data as any);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update address.');
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'checkoutAddress/deleteAddress',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteAddressApi(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete address.');
    }
  }
);

const checkoutAddressSlice = createSlice({
  name: 'checkoutAddress',
  initialState,
  reducers: {
    setSelectedAddress(state, action: PayloadAction<string>) {
      const address = state.savedAddresses.find((item) => item.id === action.payload) || null;
      state.selectedAddress = address;
      state.error = null;
    },
    updateNewAddressFormField(
      state,
      action: PayloadAction<{ field: keyof CheckoutAddressForm; value: string | boolean }>
    ) {
      const { field, value } = action.payload;
      state.newAddressForm = {
        ...state.newAddressForm,
        [field]: value,
      } as CheckoutAddressForm;
    },
    resetNewAddressForm(state) {
      state.newAddressForm = { ...initialForm };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.savedAddresses = action.payload;
        const selectedStillExists = state.selectedAddress
          ? action.payload.some((a) => a.id === state.selectedAddress!.id)
          : false;
        if (!selectedStillExists) {
          state.selectedAddress =
            action.payload.find((address) => address.isDefault) || action.payload[0] || null;
        }
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load addresses.';
      })
      .addCase(addNewAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNewAddress.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isDefault) {
          state.savedAddresses = state.savedAddresses.map((a) => ({ ...a, isDefault: false }));
        }
        state.savedAddresses.unshift(action.payload);
        state.selectedAddress = action.payload;
        state.newAddressForm = { ...initialForm };
      })
      .addCase(addNewAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to save address.';
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated.isDefault) {
          state.savedAddresses = state.savedAddresses.map((a) => ({ ...a, isDefault: false }));
        }
        const index = state.savedAddresses.findIndex((address) => address.id === updated.id);
        if (index !== -1) state.savedAddresses[index] = updated;
        state.selectedAddress = updated;
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to update address.';
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        const removedId = action.payload;
        state.savedAddresses = state.savedAddresses.filter((address) => address.id !== removedId);
        if (state.selectedAddress?.id === removedId) {
          state.selectedAddress = state.savedAddresses[0] || null;
        }
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to delete address.';
      });
  },
});

export const {
  setSelectedAddress,
  updateNewAddressFormField,
  resetNewAddressForm,
} = checkoutAddressSlice.actions;

export const selectCheckoutAddresses = (state: { checkoutAddress: CheckoutAddressState }) =>
  state.checkoutAddress.savedAddresses;
export const selectSelectedCheckoutAddress = (state: { checkoutAddress: CheckoutAddressState }) =>
  state.checkoutAddress.selectedAddress;
export const selectCheckoutAddressForm = (state: { checkoutAddress: CheckoutAddressState }) =>
  state.checkoutAddress.newAddressForm;
export const selectCheckoutAddressLoading = (state: { checkoutAddress: CheckoutAddressState }) =>
  state.checkoutAddress.loading;
export const selectCheckoutAddressError = (state: { checkoutAddress: CheckoutAddressState }) =>
  state.checkoutAddress.error;

export default checkoutAddressSlice.reducer;
