import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchCouponsApi } from '../../../../networks/shopping/cartApi';
import type { Coupon } from '../../../../types/shopping';

export interface CouponListState {
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
}

const initialState: CouponListState = {
  coupons: [],
  loading: false,
  error: null,
};

export const fetchAvailableCoupons = createAsyncThunk(
  'couponList/fetch',
  async (brandId: string | void, { rejectWithValue }) => {
    try {
      const res = await fetchCouponsApi(brandId || undefined);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load coupons');
    }
  }
);

const couponListSlice = createSlice({
  name: 'couponList',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.coupons = action.payload;
      })
      .addCase(fetchAvailableCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const selectCouponList = (state: { couponList: CouponListState }) => state.couponList;
export default couponListSlice.reducer;
