import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const sampleAddresses: SavedAddress[] = [
  {
    id: 'addr-1',
    name: 'Muhammad Waleed',
    phone: '+92 300 1234567',
    address: 'House 14, Street 8',
    city: 'Lahore',
    area: 'Gulberg III',
    landmark: 'Near Liberty Market',
    isDefault: true,
  },
  {
    id: 'addr-2',
    name: 'Waleed Hassan',
    phone: '+92 312 7654321',
    address: 'Apartment 7B, Block C',
    city: 'Karachi',
    area: 'DHA Phase 5',
    landmark: 'Opposite Phase 5 Park',
    isDefault: false,
  },
];

export const fetchAddresses = createAsyncThunk('checkoutAddress/fetchAddresses', async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return sampleAddresses;
});

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
    addNewAddress(state, action: PayloadAction<CheckoutAddressForm>) {
      const newAddress: SavedAddress = {
        ...action.payload,
        id: `addr-${Date.now()}`,
      };

      if (newAddress.isDefault) {
        state.savedAddresses = state.savedAddresses.map((address) => ({
          ...address,
          isDefault: false,
        }));
      }

      state.savedAddresses.unshift(newAddress);
      state.selectedAddress = newAddress;
      state.newAddressForm = { ...initialForm };
      state.error = null;
    },
    updateAddress(
      state,
      action: PayloadAction<{ id: string; updates: Partial<CheckoutAddressForm> }>
    ) {
      const { id, updates } = action.payload;
      const index = state.savedAddresses.findIndex((address) => address.id === id);
      if (index === -1) return;

      const updatedAddress = {
        ...state.savedAddresses[index],
        ...updates,
      };

      if (updatedAddress.isDefault) {
        state.savedAddresses = state.savedAddresses.map((address) => ({
          ...address,
          isDefault: address.id === id,
        }));
      } else {
        state.savedAddresses[index] = updatedAddress;
      }

      state.savedAddresses[index] = updatedAddress;
      state.selectedAddress = updatedAddress;
    },
    deleteAddress(state, action: PayloadAction<string>) {
      const removedId = action.payload;
      state.savedAddresses = state.savedAddresses.filter((address) => address.id !== removedId);

      if (state.selectedAddress?.id === removedId) {
        state.selectedAddress = state.savedAddresses[0] || null;
      }
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
        state.selectedAddress = action.payload.find((address) => address.isDefault) || action.payload[0] || null;
      })
      .addCase(fetchAddresses.rejected, (state) => {
        state.loading = false;
        state.error = 'Failed to load addresses.';
      });
  },
});

export const {
  setSelectedAddress,
  updateNewAddressFormField,
  resetNewAddressForm,
  addNewAddress,
  updateAddress,
  deleteAddress,
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