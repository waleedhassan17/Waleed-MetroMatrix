import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import {
  fetchReviewData,
  submitReview as submitReviewApi,
} from '../../../../networks/serviceProviders/reviewNetwork';
import {
  reviewDataSerializer,
} from '../../../../serializers/serviceProviders/reviewSerializer';

// Types
export type ServiceCategory = 'electricians' | 'plumbers' | 'ac-repairers';
export type SubmissionStatus = 'idle' | 'submitting' | 'submitted' | 'failed';

export interface ServiceProviderReview {
  id: string;
  name: string;
  image: string;
  phone: string;
  service: string;
  category: ServiceCategory;
  verified: boolean;
}

export interface CompletedServiceDetails {
  bookingId: string;
  invoiceId: string;
  description: string;
  duration: string;
  completedAt: string;
  serviceDate: string;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending';
}

export interface ReviewData {
  rating: number;
  feedback: string;
  tags: string[];
  wouldRecommend: boolean | null;
  photos: string[];
}

export interface ReviewSubmissionResult {
  reviewId: string;
  submittedAt: string;
  rewardPoints: number;
  message: string;
}

export interface ReviewRatingState {
  provider: ServiceProviderReview | null;
  serviceDetails: CompletedServiceDetails | null;
  review: ReviewData;
  submissionStatus: SubmissionStatus;
  submissionResult: ReviewSubmissionResult | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  availableTags: string[];
}

// Initial State
const initialState: ReviewRatingState = {
  provider: null,
  serviceDetails: null,
  review: {
    rating: 0,
    feedback: '',
    tags: [],
    wouldRecommend: null,
    photos: [],
  },
  submissionStatus: 'idle',
  submissionResult: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  availableTags: [
    'Professional',
    'On Time',
    'Clean Work',
    'Fair Price',
    'Skilled',
    'Friendly',
    'Quick Service',
    'Good Communication',
    'Respectful',
    'Would Hire Again',
  ],
};

// Rating feedback messages
export const RATING_MESSAGES: Record<number, { title: string; subtitle: string; emoji: string }> = {
  1: {
    title: 'Poor Experience',
    subtitle: "We're sorry to hear that. Your feedback helps us improve.",
    emoji: '😞',
  },
  2: {
    title: 'Below Average',
    subtitle: "We'll work to improve. Thank you for your feedback.",
    emoji: '😕',
  },
  3: {
    title: 'Average Experience',
    subtitle: 'Thank you for sharing your experience with us.',
    emoji: '😐',
  },
  4: {
    title: 'Good Experience',
    subtitle: "Great! We're glad you had a positive experience.",
    emoji: '😊',
  },
  5: {
    title: 'Excellent Experience',
    subtitle: 'Amazing! Thank you for the wonderful review!',
    emoji: '🤩',
  },
};

// Helper to map API review data to local format
const mapApiReviewToLocal = (apiData: ReturnType<typeof reviewDataSerializer>) => {
  const provider: ServiceProviderReview = {
    id: apiData.provider.id,
    name: apiData.provider.name,
    image: apiData.provider.image,
    phone: '',
    service: apiData.serviceDetails.type,
    category: apiData.provider.category as ServiceCategory,
    verified: true,
  };

  const serviceDetails: CompletedServiceDetails = {
    bookingId: '',
    invoiceId: '',
    description: apiData.serviceDetails.description,
    duration: '',
    completedAt: apiData.serviceDetails.completedAt,
    serviceDate: apiData.serviceDetails.completedAt,
    totalAmount: apiData.serviceDetails.amount,
    paymentStatus: 'paid' as CompletedServiceDetails['paymentStatus'],
  };

  return { provider, serviceDetails };
};

// Slice
const reviewRatingSlice = createAppSlice({
  name: 'reviewRating',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    initializeReview: create.asyncThunk(
      async (
        params: { bookingId: string; category: ServiceCategory },
        { rejectWithValue }
      ) => {
        const response = await fetchReviewData(params.bookingId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to load review data');
        }
        const serialized = reviewDataSerializer(response.data);
        return mapApiReviewToLocal(serialized);
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.provider = action.payload.provider;
          state.serviceDetails = action.payload.serviceDetails;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    submitReview: create.asyncThunk(
      async (
        params: { bookingId: string; providerId: string; review: ReviewData },
        { rejectWithValue }
      ) => {
        const response = await submitReviewApi({
          bookingId: params.bookingId,
          providerId: params.providerId,
          rating: params.review.rating,
          feedback: params.review.feedback,
          tags: params.review.tags,
        });
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to submit review');
        }
        
        // Calculate reward points based on review completeness
        let rewardPoints = 10;
        if (params.review.feedback.length > 50) rewardPoints += 5;
        if (params.review.tags.length >= 3) rewardPoints += 5;
        if (params.review.wouldRecommend !== null) rewardPoints += 5;
        if (params.review.photos.length > 0) rewardPoints += 10;

        return {
          reviewId: response.data.id,
          submittedAt: response.data.createdAt,
          rewardPoints,
          message: 'Thank you for your feedback! Your review helps other users.',
        } as ReviewSubmissionResult;
      },
      {
        pending: (state) => {
          state.isSubmitting = true;
          state.submissionStatus = 'submitting';
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isSubmitting = false;
          state.submissionStatus = 'submitted';
          state.submissionResult = action.payload;
        },
        rejected: (state, action) => {
          state.isSubmitting = false;
          state.submissionStatus = 'failed';
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    setRating: create.reducer((state, action: PayloadAction<number>) => {
      state.review.rating = action.payload;
    }),

    setFeedback: create.reducer((state, action: PayloadAction<string>) => {
      state.review.feedback = action.payload;
    }),

    toggleTag: create.reducer((state, action: PayloadAction<string>) => {
      const tag = action.payload;
      const index = state.review.tags.indexOf(tag);
      if (index === -1) {
        state.review.tags.push(tag);
      } else {
        state.review.tags.splice(index, 1);
      }
    }),

    setWouldRecommend: create.reducer((state, action: PayloadAction<boolean | null>) => {
      state.review.wouldRecommend = action.payload;
    }),

    addPhoto: create.reducer((state, action: PayloadAction<string>) => {
      if (state.review.photos.length < 5) {
        state.review.photos.push(action.payload);
      }
    }),

    removePhoto: create.reducer((state, action: PayloadAction<number>) => {
      state.review.photos.splice(action.payload, 1);
    }),

    resetReviewState: create.reducer((state) => {
      state.provider = null;
      state.serviceDetails = null;
      state.review = initialState.review;
      state.submissionStatus = 'idle';
      state.submissionResult = null;
      state.error = null;
    }),

    clearReviewError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectProvider: (state) => state.provider,
    selectServiceDetails: (state) => state.serviceDetails,
    selectReview: (state) => state.review,
    selectSubmissionStatus: (state) => state.submissionStatus,
    selectSubmissionResult: (state) => state.submissionResult,
    selectIsLoading: (state) => state.isLoading,
    selectIsSubmitting: (state) => state.isSubmitting,
    selectError: (state) => state.error,
    selectAvailableTags: (state) => state.availableTags,
  },
});

// Actions
export const {
  initializeReview,
  submitReview,
  setRating,
  setFeedback,
  toggleTag,
  setWouldRecommend,
  addPhoto,
  removePhoto,
  resetReviewState,
  clearReviewError,
} = reviewRatingSlice.actions;

// Selectors
export const {
  selectProvider,
  selectServiceDetails,
  selectReview,
  selectSubmissionStatus,
  selectSubmissionResult,
  selectIsLoading,
  selectIsSubmitting,
  selectError,
  selectAvailableTags,
} = reviewRatingSlice.selectors;

// Computed Selectors
export const selectRatingMessage = (state: { reviewRating?: ReviewRatingState }) => {
  const rating = state.reviewRating?.review.rating || 0;
  return RATING_MESSAGES[rating] || null;
};

export const selectIsReviewValid = (state: { reviewRating?: ReviewRatingState }) => {
  const reviewState = state.reviewRating;
  if (!reviewState) return false;
  return reviewState.review.rating > 0;
};

export const selectReviewCompleteness = (state: { reviewRating?: ReviewRatingState }) => {
  const reviewState = state.reviewRating;
  if (!reviewState) return 0;

  const { review } = reviewState;
  let completeness = 0;
  let totalItems = 5;

  if (review.rating > 0) completeness += 1;
  if (review.feedback.length > 0) completeness += 1;
  if (review.tags.length > 0) completeness += 1;
  if (review.wouldRecommend !== null) completeness += 1;
  if (review.photos.length > 0) completeness += 1;

  return Math.round((completeness / totalItems) * 100);
};

export const selectReviewSummary = (state: { reviewRating?: ReviewRatingState }) => {
  const reviewState = state.reviewRating;
  if (!reviewState?.provider || !reviewState?.serviceDetails) return null;

  return {
    provider: reviewState.provider,
    service: reviewState.serviceDetails,
    review: reviewState.review,
    completeness: selectReviewCompleteness(state),
    ratingMessage: selectRatingMessage(state),
  };
};

export const selectSelectedTags = (state: { reviewRating?: ReviewRatingState }) => {
  return state.reviewRating?.review.tags || [];
};

export default reviewRatingSlice.reducer;