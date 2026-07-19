import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchVendorReviewsApi,
  respondToReviewApi,
} from '../../../../networks/shopping/vendorApi';
import type { ProductReview } from '../../../../types/shopping';

export type BrandReviewItem = ProductReview & {
  productName?: string;
  productImage?: string;
  vendorResponse?: string;
};

export interface BrandReviewsState {
  reviews: BrandReviewItem[];
  ratingFilter: number | null;
  loading: boolean;
  responding: string | null;
  error: string | null;
}

const initialState: BrandReviewsState = {
  reviews: [],
  ratingFilter: null,
  loading: false,
  responding: null,
  error: null,
};

export const fetchBrandReviews = createAsyncThunk(
  'brandReviews/fetch',
  async (rating: number | void, { rejectWithValue }) => {
    try {
      const res = await fetchVendorReviewsApi({ page: 1, limit: 50, rating: rating || undefined });
      return res.data as BrandReviewItem[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load reviews');
    }
  }
);

export const respondToReview = createAsyncThunk(
  'brandReviews/respond',
  async ({ reviewId, response }: { reviewId: string; response: string }, { rejectWithValue }) => {
    try {
      await respondToReviewApi(reviewId, response);
      return { reviewId, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send response');
    }
  }
);

const brandReviewsSlice = createSlice({
  name: 'brandReviews',
  initialState,
  reducers: {
    setRatingFilter(state, action: PayloadAction<number | null>) {
      state.ratingFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload;
      })
      .addCase(fetchBrandReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(respondToReview.pending, (state, action) => {
        state.responding = action.meta.arg.reviewId;
      })
      .addCase(respondToReview.fulfilled, (state, action) => {
        state.responding = null;
        const review = state.reviews.find((r) => r.reviewId === action.payload.reviewId);
        if (review) review.vendorResponse = action.payload.response;
      })
      .addCase(respondToReview.rejected, (state, action) => {
        state.responding = null;
        state.error = action.payload as string;
      });
  },
});

export const { setRatingFilter } = brandReviewsSlice.actions;
export const selectBrandReviews = (state: { brandReviews: BrandReviewsState }) => state.brandReviews;
export default brandReviewsSlice.reducer;
