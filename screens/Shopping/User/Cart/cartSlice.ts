import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';

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

// ── Constants ───────────────────────────────

const SHIPPING_PER_BRAND = 150;
const FREE_SHIPPING_THRESHOLD = 3000;

// ── Helpers ─────────────────────────────────

function calculateTotals(items: CartItemState[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function calculateShipping(items: CartItemState[]): number {
  const brandIds = [...new Set(items.map((i) => i.brandId))];
  return brandIds.reduce((fee, brandId) => {
    const brandSubtotal = items
      .filter((i) => i.brandId === brandId)
      .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return fee + (brandSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PER_BRAND);
  }, 0);
}

function applyCoupon(subtotal: number, coupon: Coupon | null): number {
  if (!coupon || subtotal < coupon.minOrderAmount) return 0;
  let discount =
    coupon.discountType === 'percentage'
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;
  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }
  return Math.round(discount);
}

function recalcCart(state: CartState) {
  const subtotal = calculateTotals(state.items);
  const shipping = calculateShipping(state.items);
  const couponDiscount = applyCoupon(subtotal, state.appliedCoupon);
  state.subtotal = subtotal;
  state.shippingFee = shipping;
  state.couponDiscount = couponDiscount;
  state.total = subtotal + shipping - couponDiscount;
}

// ── Async Thunks ────────────────────────────

export const applyCouponAsync = createAsyncThunk(
  'cart/applyCouponAsync',
  async (code: string, { rejectWithValue }) => {
    try {
      // Simulate API call for coupon validation
      const validCoupons: Record<string, Coupon> = {
        SAVE10: { code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderAmount: 2000, maxDiscount: 1000 },
        SAVE20: { code: 'SAVE20', discountType: 'percentage', discountValue: 20, minOrderAmount: 5000, maxDiscount: 2000 },
        FLAT500: { code: 'FLAT500', discountType: 'fixed', discountValue: 500, minOrderAmount: 3000 },
        WELCOME: { code: 'WELCOME', discountType: 'percentage', discountValue: 15, minOrderAmount: 1500, maxDiscount: 1500 },
      };
      const coupon = validCoupons[code.toUpperCase()];
      if (!coupon) {
        return rejectWithValue('Invalid coupon code');
      }
      return coupon;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to apply coupon');
    }
  }
);

// ── Slice ───────────────────────────────────

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItemState>) {
      const newItem = action.payload;
      const existingIndex = state.items.findIndex(
        (i) => i.productId === newItem.productId && i.variantId === newItem.variantId
      );
      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += newItem.quantity;
        state.items[existingIndex].totalPrice =
          state.items[existingIndex].unitPrice * state.items[existingIndex].quantity;
      } else {
        state.items.push(newItem);
      }
      recalcCart(state);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.itemId !== action.payload);
      recalcCart(state);
      if (state.items.length === 0) {
        state.appliedCoupon = null;
      }
    },
    updateQuantity(state, action: PayloadAction<{ itemId: string; quantity: number }>) {
      const { itemId, quantity } = action.payload;
      const item = state.items.find((i) => i.itemId === itemId);
      if (item) {
        item.quantity = Math.max(1, quantity);
        item.totalPrice = item.unitPrice * item.quantity;
      }
      recalcCart(state);
    },
    removeCoupon(state) {
      state.appliedCoupon = null;
      state.couponDiscount = 0;
      recalcCart(state);
    },
    clearCart(state) {
      Object.assign(state, initialState);
    },
    syncCart(state, action: PayloadAction<CartItemState[]>) {
      state.items = action.payload;
      recalcCart(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(applyCouponAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyCouponAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.appliedCoupon = action.payload;
        recalcCart(state);
      })
      .addCase(applyCouponAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  removeCoupon,
  clearCart,
  syncCart,
} = cartSlice.actions;

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
