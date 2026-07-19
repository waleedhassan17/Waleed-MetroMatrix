import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchVendorCouponsApi,
  createVendorCouponApi,
  updateVendorCouponApi,
} from '../../../../networks/shopping/vendorApi';
import type { Coupon } from '../../../../types/shopping';

export interface BrandCouponsState {
  coupons: (Coupon & { isActive?: boolean })[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: BrandCouponsState = {
  coupons: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchBrandCoupons = createAsyncThunk(
  'brandCoupons/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchVendorCouponsApi();
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load coupons');
    }
  }
);

export const createBrandCoupon = createAsyncThunk(
  'brandCoupons/create',
  async (payload: Partial<Coupon>, { rejectWithValue }) => {
    try {
      const res = await createVendorCouponApi(payload);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create coupon');
    }
  }
);

export const updateBrandCoupon = createAsyncThunk(
  'brandCoupons/update',
  async (
    { couponCode, updates }: { couponCode: string; updates: Partial<Coupon> & { isActive?: boolean } },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateVendorCouponApi(couponCode, updates);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update coupon');
    }
  }
);

const brandCouponsSlice = createSlice({
  name: 'brandCoupons',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.coupons = action.payload;
      })
      .addCase(fetchBrandCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createBrandCoupon.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createBrandCoupon.fulfilled, (state, action) => {
        state.saving = false;
        state.coupons.unshift(action.payload);
      })
      .addCase(createBrandCoupon.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(updateBrandCoupon.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateBrandCoupon.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.coupons.findIndex((c) => c.couponCode === action.payload.couponCode);
        if (index !== -1) state.coupons[index] = action.payload;
      })
      .addCase(updateBrandCoupon.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const selectBrandCoupons = (state: { brandCoupons: BrandCouponsState }) => state.brandCoupons;
export default brandCouponsSlice.reducer;
