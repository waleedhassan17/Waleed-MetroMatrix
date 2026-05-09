import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  iconLabel: string;
}

export interface SavedCard {
  id: string;
  cardholderName: string;
  last4: string;
  expiry: string;
}

export interface CheckoutPaymentState {
  paymentMethods: PaymentMethod[];
  selectedMethod: PaymentMethod | null;
  savedCards: SavedCard[];
  loading: boolean;
  error: string | null;
  walletBalance: number;
  walletCurrency: string;
}

const initialState: CheckoutPaymentState = {
  paymentMethods: [],
  selectedMethod: null,
  savedCards: [
    { id: 'card-1', cardholderName: 'Muhammad Waleed', last4: '4242', expiry: '12/28' },
  ],
  loading: false,
  error: null,
  walletBalance: 0,
  walletCurrency: 'usd',
};

// Fetch payment methods and inject current wallet balance from global wallet state
export const fetchPaymentMethods = createAsyncThunk(
  'checkoutPayment/fetchPaymentMethods',
  async (_, { getState }) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const state = getState() as { wallet: { balance: number; currency: string } };
    const balance = state.wallet?.balance ?? 0;
    const currency = state.wallet?.currency ?? 'usd';

    const getCurrencySymbol = (code: string) => {
      const map: Record<string, string> = { usd: '$', eur: '€', gbp: '£', pkr: '₨', inr: '₹' };
      return map[code.toLowerCase()] || code.toUpperCase();
    };

    const sym = getCurrencySymbol(currency);
    const formattedBalance = balance.toFixed(2);

    const methods: PaymentMethod[] = [
      { id: 'cod', name: 'Cash on Delivery (COD)', description: 'Pay when your order arrives.', iconLabel: 'COD' },
      {
        id: 'wallet',
        name: 'MetroMatrix Wallet',
        description: `Available balance: ${sym}${formattedBalance} ${currency.toUpperCase()}`,
        iconLabel: 'Wallet',
      },
      { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard, and more.', iconLabel: 'Card' },
      { id: 'jazzcash', name: 'JazzCash / EasyPaisa', description: 'Mobile wallet payments.', iconLabel: 'Mobile' },
      { id: 'bank', name: 'Bank Transfer', description: 'Direct transfer from your bank.', iconLabel: 'Bank' },
    ];

    return { methods, balance, currency };
  }
);

const checkoutPaymentSlice = createSlice({
  name: 'checkoutPayment',
  initialState,
  reducers: {
    setSelectedMethod(state, action: PayloadAction<string>) {
      state.selectedMethod = state.paymentMethods.find((m) => m.id === action.payload) || null;
      state.error = null;
    },
    addCard(state, action: PayloadAction<SavedCard>) {
      state.savedCards.unshift(action.payload);
    },
    removeCard(state, action: PayloadAction<string>) {
      state.savedCards = state.savedCards.filter((c) => c.id !== action.payload);
    },
    refreshWalletBalance(state, action: PayloadAction<{ balance: number; currency: string }>) {
      state.walletBalance = action.payload.balance;
      state.walletCurrency = action.payload.currency;
      const idx = state.paymentMethods.findIndex((m) => m.id === 'wallet');
      if (idx !== -1) {
        const sym = action.payload.currency.toLowerCase() === 'pkr' ? '₨' : '$';
        state.paymentMethods[idx].description =
          `Available balance: ${sym}${action.payload.balance.toFixed(2)} ${action.payload.currency.toUpperCase()}`;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentMethods.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentMethods = action.payload.methods;
        state.walletBalance = action.payload.balance;
        state.walletCurrency = action.payload.currency;
        state.selectedMethod = action.payload.methods[0] || null;
      })
      .addCase(fetchPaymentMethods.rejected, (state) => {
        state.loading = false;
        state.error = 'Failed to load payment methods.';
      });
  },
});

export const { setSelectedMethod, addCard, removeCard, refreshWalletBalance } = checkoutPaymentSlice.actions;

export const selectCheckoutPaymentMethods = (state: { checkoutPayment: CheckoutPaymentState }) =>
  state.checkoutPayment.paymentMethods;
export const selectSelectedCheckoutPaymentMethod = (state: { checkoutPayment: CheckoutPaymentState }) =>
  state.checkoutPayment.selectedMethod;
export const selectSavedCards = (state: { checkoutPayment: CheckoutPaymentState }) =>
  state.checkoutPayment.savedCards;
export const selectCheckoutPaymentLoading = (state: { checkoutPayment: CheckoutPaymentState }) =>
  state.checkoutPayment.loading;
export const selectCheckoutWalletBalance = (state: { checkoutPayment: CheckoutPaymentState }) =>
  state.checkoutPayment.walletBalance;
export const selectCheckoutWalletCurrency = (state: { checkoutPayment: CheckoutPaymentState }) =>
  state.checkoutPayment.walletCurrency;

export default checkoutPaymentSlice.reducer;
