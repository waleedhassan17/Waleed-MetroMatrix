import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProductReview } from '../../../../types/shopping';
import { fetchProductReviewsApi } from '../../../../networks/shopping/productApi';

// ── State Interface ─────────────────────────

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ProductReviewsState {
  reviews: ProductReview[];
  ratingBreakdown: RatingBreakdown;
  averageRating: number;
  totalReviews: number;
  filterRating: number | null; // null = all, 1-5 = specific
  hasPhotosOnly: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const initialState: ProductReviewsState = {
  reviews: [],
  ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  averageRating: 0,
  totalReviews: 0,
  filterRating: null,
  hasPhotosOnly: false,
  loading: false,
  loadingMore: false,
  error: null,
  page: 1,
  totalPages: 1,
  hasMore: false,
};

// ── Async Thunks ────────────────────────────

export const fetchReviews = createAsyncThunk(
  'productReviews/fetchReviews',
  async (
    { productId, page = 1, refresh = false }: { productId: string; page?: number; refresh?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetchProductReviewsApi(productId, { page, limit: 15 });

      if (!res.success) {
        return rejectWithValue('Failed to fetch reviews');
      }

      return {
        reviews: res.data,
        page: res.pagination.page,
        totalPages: res.pagination.pages,
        total: res.pagination.total,
        refresh,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Failed to load reviews.');
    }
  }
);

export const loadMoreReviews = createAsyncThunk(
  'productReviews/loadMoreReviews',
  async (productId: string, { getState, dispatch }) => {
    const state = getState() as { productReviews: ProductReviewsState };
    if (state.productReviews.hasMore && !state.productReviews.loadingMore) {
      return dispatch(fetchReviews({ productId, page: state.productReviews.page + 1 })).unwrap();
    }
  }
);

// ── Slice ───────────────────────────────────

const productReviewsSlice = createSlice({
  name: 'productReviews',
  initialState,
  reducers: {
    setFilterRating(state, action: PayloadAction<number | null>) {
      state.filterRating = action.payload;
    },
    togglePhotosOnly(state) {
      state.hasPhotosOnly = !state.hasPhotosOnly;
    },
    resetProductReviews(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state, action) => {
        if (action.meta.arg.page && action.meta.arg.page > 1) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;

        const { reviews, page, totalPages, total, refresh } = action.payload;

        if (refresh || page === 1) {
          state.reviews = reviews;
          // Compute breakdown from all fetched reviews
          const breakdown: RatingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          let sum = 0;
          reviews.forEach((r) => {
            const key = Math.min(5, Math.max(1, Math.round(r.rating))) as keyof RatingBreakdown;
            breakdown[key]++;
            sum += r.rating;
          });
          state.ratingBreakdown = breakdown;
          state.averageRating = reviews.length > 0 ? sum / reviews.length : 0;
          state.totalReviews = total;
        } else {
          const existingIds = new Set(state.reviews.map((r) => r.reviewId));
          const newReviews = reviews.filter((r: ProductReview) => !existingIds.has(r.reviewId));
          state.reviews = [...state.reviews, ...newReviews];
          // Update breakdown incrementally
          newReviews.forEach((r) => {
            const key = Math.min(5, Math.max(1, Math.round(r.rating))) as keyof RatingBreakdown;
            state.ratingBreakdown[key]++;
          });
        }

        state.page = page;
        state.totalPages = totalPages;
        state.hasMore = page < totalPages;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilterRating, togglePhotosOnly, resetProductReviews } =
  productReviewsSlice.actions;

// ── Selectors ───────────────────────────────

export const selectProductReviewsState = (state: { productReviews: ProductReviewsState }) => state.productReviews;
export const selectAllReviews = (state: { productReviews: ProductReviewsState }) => state.productReviews.reviews;
export const selectRatingBreakdown = (state: { productReviews: ProductReviewsState }) => state.productReviews.ratingBreakdown;
export const selectReviewsLoading = (state: { productReviews: ProductReviewsState }) => state.productReviews.loading;
export const selectFilterRating = (state: { productReviews: ProductReviewsState }) => state.productReviews.filterRating;
export const selectHasPhotosOnly = (state: { productReviews: ProductReviewsState }) => state.productReviews.hasPhotosOnly;

// Filtered reviews selector
export const selectFilteredReviews = (state: { productReviews: ProductReviewsState }) => {
  const { reviews, filterRating, hasPhotosOnly } = state.productReviews;
  let filtered = reviews;
  if (filterRating !== null) {
    filtered = filtered.filter((r) => Math.round(r.rating) === filterRating);
  }
  if (hasPhotosOnly) {
    filtered = filtered.filter((r) => r.images && r.images.length > 0);
  }
  return filtered;
};

export default productReviewsSlice.reducer;
