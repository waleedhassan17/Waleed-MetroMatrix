import { createAsyncThunk, PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit';
import {
  fetchCartApi,
  addToCartApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
  applyCouponApi,
  removeCouponApi,
  type CartView,
} from '../../../../networks/shopping/cartApi';

// ── Cart Item State (with display fields) ───

export interface CartItemState {
  itemId: string;
  productId: string;
  brandId: string;
  brandName: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // Display fields
  productName: string;
  productImage: string;
  size?: string;
  color?: string;
  colorCode?: string;
}

// ── Coupon interface ────────────────────────

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
}

// ── State Interface ─────────────────────────

export interface CartState {
  items: CartItemState[];
  subtotal: number;
  discount: number;
  couponDiscount: number;
  shippingFee: number;
  total: number;
  appliedCoupon: Coupon | null;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  discount: 0,
  couponDiscount: 0,
  shippingFee: 0,
  total: 0,
  appliedCoupon: null,
  loading: false,
  error: null,
};

// The server owns the cart: every thunk below returns the recomputed
// server cart, which is mapped back onto this state shape.

const applyServerCart = (state: CartState, cart: CartView) => {
  state.items = cart.items.map((it) => ({
    itemId: it.itemId,
    productId: it.productId,
    brandId: it.brandId,
    brandName: it.brandName || '',
    variantId: it.variantId,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    totalPrice: it.totalPrice,
    productName: it.productName || '',
    productImage: it.productImage || '',
    size: it.size,
    color: it.color,
    colorCode: it.colorCode,
  }));
  state.subtotal = cart.subtotal;
  state.discount = cart.discount;
  state.couponDiscount = cart.discount;
  state.shippingFee = cart.shippingFee;
  state.total = cart.total;
  state.appliedCoupon = cart.appliedCoupon
    ? {
        code: cart.appliedCoupon,
        discountType: 'fixed',
        discountValue: cart.discount,
        minOrderAmount: 0,
      }
    : null;
};

// ── Async Thunks (server-backed) ────────────

export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchCartApi();
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load cart');
  }
});

export const addItem = createAsyncThunk(
  'cart/addItem',
  async (item: CartItemState, { rejectWithValue }) => {
    try {
      const res = await addToCartApi({
        productId: item.productId,
        brandId: item.brandId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add item to cart');
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ itemId, quantity }: { itemId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const res = await updateCartItemApi(itemId, Math.max(1, quantity));
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update quantity');
    }
  }
);

export const removeItem = createAsyncThunk(
  'cart/removeItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const res = await removeCartItemApi(itemId);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove item');
    }
  }
);

export const applyCouponAsync = createAsyncThunk(
  'cart/applyCouponAsync',
  async (code: string, { rejectWithValue }) => {
    try {
      const res = await applyCouponApi(code.trim());
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to apply coupon');
    }
  }
);

export const removeCoupon = createAsyncThunk(
  'cart/removeCoupon',
  async (_, { rejectWithValue }) => {
    try {
      const res = await removeCouponApi();
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove coupon');
    }
  }
);

export const clearCart = createAsyncThunk('cart/clearCart', async (_, { rejectWithValue }) => {
  try {
    await clearCartApi();
    return true;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to clear cart');
  }
});

// ── Slice ───────────────────────────────────

const serverCartThunks = [fetchCart, addItem, updateQuantity, removeItem, applyCouponAsync, removeCoupon] as const;

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Local sync fallback (offline demo only)
    syncCart(state, action: PayloadAction<CartItemState[]>) {
      state.items = action.payload;
    },
    clearCartError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    serverCartThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          applyServerCart(state, action.payload as CartView);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        });
    });
    builder
      .addCase(clearCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearCart.fulfilled, () => ({ ...initialState }))
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { syncCart, clearCartError } = cartSlice.actions;

// ── Selectors ───────────────────────────────

export const selectCart = (state: { cart: CartState }) => state.cart;
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (state: { cart: CartState }) => state.cart.subtotal;
export const selectCartShipping = (state: { cart: CartState }) => state.cart.shippingFee;
export const selectCartTotal = (state: { cart: CartState }) => state.cart.total;
export const selectAppliedCoupon = (state: { cart: CartState }) => state.cart.appliedCoupon;
export const selectCouponDiscount = (state: { cart: CartState }) => state.cart.couponDiscount;
export const selectCartLoading = (state: { cart: CartState }) => state.cart.loading;
export const selectCartError = (state: { cart: CartState }) => state.cart.error;

// Grouped by brand (memoized)
export const selectCartGroupedByBrand = createSelector(
  [selectCartItems],
  (items) => {
    const groups = new Map<string, { brandId: string; brandName: string; items: CartItemState[] }>();
    items.forEach((item) => {
      if (!groups.has(item.brandId)) {
        groups.set(item.brandId, { brandId: item.brandId, brandName: item.brandName, items: [] });
      }
      groups.get(item.brandId)!.items.push(item);
    });
    return Array.from(groups.values());
  }
);

// Brand subtotals (memoized)
export const selectBrandSubtotals = createSelector(
  [selectCartItems],
  (items) => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      map.set(item.brandId, (map.get(item.brandId) || 0) + item.unitPrice * item.quantity);
    });
    return map;
  }
);

export default cartSlice.reducer;
