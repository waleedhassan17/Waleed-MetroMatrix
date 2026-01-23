import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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

// Mock data for different categories
const MOCK_PROVIDERS: Record<ServiceCategory, ServiceProviderReview> = {
  electricians: {
    id: 'elec-001',
    name: 'Usman Ali',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    phone: '+92 300 1234567',
    service: 'Electrical Services',
    category: 'electricians',
    verified: true,
  },
  plumbers: {
    id: 'plumb-001',
    name: 'Ahmad Raza',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    phone: '+92 300 9876543',
    service: 'Plumbing Services',
    category: 'plumbers',
    verified: true,
  },
  'ac-repairers': {
    id: 'ac-001',
    name: 'Bilal Ahmed',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    phone: '+92 300 5551234',
    service: 'AC Repair Services',
    category: 'ac-repairers',
    verified: true,
  },
};

const MOCK_SERVICE_DETAILS: Record<ServiceCategory, Omit<CompletedServiceDetails, 'bookingId'>> = {
  electricians: {
    invoiceId: 'INV-EL-001234',
    description: 'Electrical wiring repair and circuit breaker inspection',
    duration: '2-3 hours',
    completedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    serviceDate: 'Today',
    totalAmount: 4500,
    paymentStatus: 'paid',
  },
  plumbers: {
    invoiceId: 'INV-PL-001235',
    description: 'Pipe leak repair and bathroom fixture installation',
    duration: '1-2 hours',
    completedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    serviceDate: 'Today',
    totalAmount: 3200,
    paymentStatus: 'paid',
  },
  'ac-repairers': {
    invoiceId: 'INV-AC-001236',
    description: 'AC gas refilling, filter cleaning and cooling optimization',
    duration: '1-2 hours',
    completedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    serviceDate: 'Today',
    totalAmount: 5000,
    paymentStatus: 'paid',
  },
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

// Async Thunks
export const initializeReview = createAsyncThunk(
  'reviewRating/initialize',
  async ({
    bookingId,
    category,
  }: {
    bookingId: string;
    category: ServiceCategory;
  }) => {
    // Simulate API call
    return new Promise<{
      provider: ServiceProviderReview;
      serviceDetails: CompletedServiceDetails;
    }>((resolve) => {
      setTimeout(() => {
        const provider = MOCK_PROVIDERS[category];
        const details = MOCK_SERVICE_DETAILS[category];

        resolve({
          provider,
          serviceDetails: {
            ...details,
            bookingId,
          },
        });
      }, 600);
    });
  }
);

export const submitReview = createAsyncThunk(
  'reviewRating/submit',
  async ({
    bookingId,
    providerId,
    review,
  }: {
    bookingId: string;
    providerId: string;
    review: ReviewData;
  }) => {
    // Simulate API call
    return new Promise<ReviewSubmissionResult>((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional submission failure (5% chance)
        if (Math.random() < 0.05) {
          reject(new Error('Failed to submit review. Please try again.'));
          return;
        }

        // Calculate reward points based on review completeness
        let rewardPoints = 10; // Base points
        if (review.feedback.length > 50) rewardPoints += 5;
        if (review.tags.length >= 3) rewardPoints += 5;
        if (review.wouldRecommend !== null) rewardPoints += 5;
        if (review.photos.length > 0) rewardPoints += 10;

        resolve({
          reviewId: `REV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          submittedAt: new Date().toISOString(),
          rewardPoints,
          message: 'Thank you for your feedback! Your review helps other users.',
        });
      }, 2000);
    });
  }
);

// Slice
const reviewRatingSlice = createSlice({
  name: 'reviewRating',
  initialState,
  reducers: {
    setRating: (state, action: PayloadAction<number>) => {
      state.review.rating = action.payload;
    },
    setFeedback: (state, action: PayloadAction<string>) => {
      state.review.feedback = action.payload;
    },
    toggleTag: (state, action: PayloadAction<string>) => {
      const tag = action.payload;
      const index = state.review.tags.indexOf(tag);
      if (index === -1) {
        state.review.tags.push(tag);
      } else {
        state.review.tags.splice(index, 1);
      }
    },
    setWouldRecommend: (state, action: PayloadAction<boolean | null>) => {
      state.review.wouldRecommend = action.payload;
    },
    addPhoto: (state, action: PayloadAction<string>) => {
      if (state.review.photos.length < 5) {
        state.review.photos.push(action.payload);
      }
    },
    removePhoto: (state, action: PayloadAction<number>) => {
      state.review.photos.splice(action.payload, 1);
    },
    resetReviewState: (state) => {
      state.provider = null;
      state.serviceDetails = null;
      state.review = initialState.review;
      state.submissionStatus = 'idle';
      state.submissionResult = null;
      state.error = null;
    },
    clearReviewError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize review
      .addCase(initializeReview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeReview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload.provider;
        state.serviceDetails = action.payload.serviceDetails;
      })
      .addCase(initializeReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load review data';
      })
      // Submit review
      .addCase(submitReview.pending, (state) => {
        state.isSubmitting = true;
        state.submissionStatus = 'submitting';
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submissionStatus = 'submitted';
        state.submissionResult = action.payload;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submissionStatus = 'failed';
        state.error = action.error.message || 'Failed to submit review';
      });
  },
});

// Actions
export const {
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