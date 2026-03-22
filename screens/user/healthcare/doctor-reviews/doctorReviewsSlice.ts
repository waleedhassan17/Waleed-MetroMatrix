import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DoctorReview } from '../../../../models/healthcare/types';
import type { Pagination } from '../../../../models/serviceProviders/common';
import { fetchDoctorReviewsApi } from '../../../../networks/healthcare/doctorApi';
import type { RootState } from '../../../../store/store';

// ── Types ───────────────────────────────────

export type FilterRating = 0 | 1 | 2 | 3 | 4 | 5; // 0 = all
export type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
  average: number;
  total: number;
}

export interface ReviewStats {
  positivePercentage: number;
  withComments: number;
  withResponses: number;
  recentCount: number; // Last 30 days
}

export interface DoctorReviewsState {
  doctorId: string;
  doctorName: string;
  reviews: DoctorReview[];
  ratingBreakdown: RatingBreakdown;
  filterRating: FilterRating;
  sortBy: SortOption;
  pagination: Pagination;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialPagination: Pagination = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
  hasNext: false,
  hasPrevious: false,
};

const initialState: DoctorReviewsState = {
  doctorId: '',
  doctorName: '',
  reviews: [],
  ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, average: 0, total: 0 },
  filterRating: 0,
  sortBy: 'newest',
  pagination: initialPagination,
  loading: false,
  loadingMore: false,
  error: null,
  lastUpdated: null,
};

// ── Helpers ─────────────────────────────────

function computeBreakdown(reviews: DoctorReview[]): RatingBreakdown {
  const breakdown: RatingBreakdown = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
    average: 0,
    total: reviews.length,
  };

  for (const review of reviews) {
    const key = Math.min(5, Math.max(1, Math.round(review.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    breakdown[key]++;
  }

  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    breakdown.average = parseFloat((sum / reviews.length).toFixed(1));
  }

  return breakdown;
}

function computeStats(reviews: DoctorReview[]): ReviewStats {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let positiveCount = 0;
  let withComments = 0;
  let withResponses = 0;
  let recentCount = 0;

  for (const review of reviews) {
    if (review.rating >= 4) positiveCount++;
    if (review.comment && review.comment.trim().length > 0) withComments++;
    if (review.response) withResponses++;
    if (new Date(review.createdAt).getTime() > thirtyDaysAgo) recentCount++;
  }

  return {
    positivePercentage:
      reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : 0,
    withComments,
    withResponses,
    recentCount,
  };
}

function sortReviews(reviews: DoctorReview[], sortBy: SortOption): DoctorReview[] {
  const sorted = [...reviews];

  switch (sortBy) {
    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    case 'highest':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'lowest':
      return sorted.sort((a, b) => a.rating - b.rating);
    default:
      return sorted;
  }
}

// ── Async Thunks ────────────────────────────

export const fetchReviews = createAsyncThunk<
  { reviews: DoctorReview[]; pagination: Pagination },
  string, // doctorId
  { rejectValue: string }
>('doctorReviews/fetchReviews', async (doctorId, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorReviewsApi({ doctorId, page: 1, limit: 50 });

    if (res.success) {
      return res.data;
    }

    return rejectWithValue(res.message || 'Failed to load reviews');
  } catch (error: any) {
    if (error.message?.includes('Network')) {
      return rejectWithValue('No internet connection. Please check your network.');
    }
    return rejectWithValue('Something went wrong. Please try again.');
  }
});

export const loadMoreReviews = createAsyncThunk<
  { reviews: DoctorReview[]; pagination: Pagination },
  void,
  { state: RootState; rejectValue: string }
>('doctorReviews/loadMoreReviews', async (_, { getState, rejectWithValue }) => {
  const { doctorId, pagination } = getState().doctorReviews;

  if (!pagination.hasNext) {
    return rejectWithValue('No more reviews');
  }

  try {
    const res = await fetchDoctorReviewsApi({
      doctorId,
      page: pagination.currentPage + 1,
      limit: pagination.itemsPerPage,
    });

    if (res.success) {
      return res.data;
    }

    return rejectWithValue(res.message || 'Failed to load more reviews');
  } catch (error: any) {
    return rejectWithValue('Something went wrong');
  }
});

export const reportReview = createAsyncThunk<
  string, // reviewId
  { reviewId: string; reason: string },
  { rejectValue: string }
>('doctorReviews/reportReview', async ({ reviewId, reason }, { rejectWithValue }) => {
  try {
    // API call to report review
    // await reportReviewApi({ reviewId, reason });
    return reviewId;
  } catch {
    return rejectWithValue('Failed to report review');
  }
});

export const markReviewHelpful = createAsyncThunk<
  { reviewId: string; helpfulCount: number },
  string, // reviewId
  { rejectValue: string }
>('doctorReviews/markReviewHelpful', async (reviewId, { rejectWithValue }) => {
  try {
    // API call to mark as helpful
    // const res = await markReviewHelpfulApi(reviewId);
    return { reviewId, helpfulCount: 1 }; // Return updated count
  } catch {
    return rejectWithValue('Failed to mark as helpful');
  }
});

// ── Slice ───────────────────────────────────

const doctorReviewsSlice = createSlice({
  name: 'doctorReviews',
  initialState,
  reducers: {
    setFilterRating(state, action: PayloadAction<FilterRating>) {
      state.filterRating = action.payload;
    },

    setSortBy(state, action: PayloadAction<SortOption>) {
      state.sortBy = action.payload;
    },

    setDoctorInfo(
      state,
      action: PayloadAction<{ doctorId: string; doctorName: string }>
    ) {
      state.doctorId = action.payload.doctorId;
      state.doctorName = action.payload.doctorName;
    },

    clearFilters(state) {
      state.filterRating = 0;
      state.sortBy = 'newest';
    },

    clearError(state) {
      state.error = null;
    },

    resetReviews() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchReviews
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
        state.pagination = action.payload.pagination;
        state.doctorId = action.meta.arg;
        state.ratingBreakdown = computeBreakdown(action.payload.reviews);
        state.lastUpdated = Date.now();
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load reviews';
      })

      // loadMoreReviews
      .addCase(loadMoreReviews.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(loadMoreReviews.fulfilled, (state, action) => {
        state.loadingMore = false;
        const allReviews = [...state.reviews, ...action.payload.reviews];
        state.reviews = allReviews;
        state.pagination = action.payload.pagination;
        state.ratingBreakdown = computeBreakdown(allReviews);
      })
      .addCase(loadMoreReviews.rejected, (state) => {
        state.loadingMore = false;
      })

      // markReviewHelpful
      .addCase(markReviewHelpful.fulfilled, (state, action) => {
        const review = state.reviews.find(
          (r) => r.reviewId === action.payload.reviewId
        );
        if (review) {
          review.helpfulCount = (review.helpfulCount || 0) + 1;
        }
      });
  },
});

export const {
  setFilterRating,
  setSortBy,
  setDoctorInfo,
  clearFilters,
  clearError,
  resetReviews,
} = doctorReviewsSlice.actions;

// ── Selectors ───────────────────────────────

// Get filtered and sorted reviews
export const selectFilteredReviews = (state: RootState): DoctorReview[] => {
  const { reviews, filterRating, sortBy } = state.doctorReviews;

  // Filter by rating
  let filtered = reviews;
  if (filterRating > 0) {
    filtered = reviews.filter((r) => Math.round(r.rating) === filterRating);
  }

  // Sort
  return sortReviews(filtered, sortBy);
};

// Get review statistics
export const selectReviewStats = (state: RootState): ReviewStats => {
  return computeStats(state.doctorReviews.reviews);
};

// Get rating breakdown
export const selectRatingBreakdown = (state: RootState): RatingBreakdown => {
  return state.doctorReviews.ratingBreakdown;
};

// Get average rating
export const selectAverageRating = (state: RootState): number => {
  return state.doctorReviews.ratingBreakdown.average;
};

// Get total review count
export const selectTotalReviews = (state: RootState): number => {
  return state.doctorReviews.ratingBreakdown.total;
};

// Get filtered review count
export const selectFilteredReviewCount = (state: RootState): number => {
  const { reviews, filterRating } = state.doctorReviews;
  if (filterRating === 0) return reviews.length;
  return reviews.filter((r) => Math.round(r.rating) === filterRating).length;
};

// Check if there are any reviews
export const selectHasReviews = (state: RootState): boolean => {
  return state.doctorReviews.reviews.length > 0;
};

// Get reviews with responses
export const selectReviewsWithResponses = (state: RootState): DoctorReview[] => {
  return state.doctorReviews.reviews.filter((r) => r.response);
};

// Get recent reviews (last 7 days)
export const selectRecentReviews = (state: RootState): DoctorReview[] => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.doctorReviews.reviews.filter(
    (r) => new Date(r.createdAt).getTime() > weekAgo
  );
};

// Get a specific review by ID
export const selectReviewById =
  (reviewId: string) =>
  (state: RootState): DoctorReview | undefined => {
    return state.doctorReviews.reviews.find((r) => r.reviewId === reviewId);
  };

// Check loading states
export const selectIsLoading = (state: RootState): boolean => {
  return state.doctorReviews.loading;
};

export const selectIsLoadingMore = (state: RootState): boolean => {
  return state.doctorReviews.loadingMore;
};

// Get current filter and sort options
export const selectCurrentFilters = (state: RootState) => ({
  filterRating: state.doctorReviews.filterRating,
  sortBy: state.doctorReviews.sortBy,
});

// Check if filters are active
export const selectHasActiveFilters = (state: RootState): boolean => {
  return (
    state.doctorReviews.filterRating !== 0 ||
    state.doctorReviews.sortBy !== 'newest'
  );
};

export default doctorReviewsSlice.reducer;