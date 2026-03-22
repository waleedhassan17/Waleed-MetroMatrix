import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Doctor, DoctorReview, Clinic } from '../../../../models/healthcare/types';
import type { Pagination } from '../../../../models/serviceProviders/common';
import {
  fetchDoctorByIdApi,
  fetchDoctorReviewsApi,
} from '../../../../networks/healthcare/doctorApi';
import type { RootState } from '../../../../store/store';

// ── Tab Type ────────────────────────────────

export type DetailTab = 'about' | 'reviews' | 'locations';

// ── State ───────────────────────────────────

export interface DoctorDetailState {
  doctor: Doctor | null;
  reviews: DoctorReview[];
  clinics: Clinic[];
  loading: boolean;
  reviewsLoading: boolean;
  error: string | null;
  reviewsError: string | null;
  activeTab: DetailTab;
  reviewsPagination: Pagination;
  // New state
  isFavorite: boolean;
  relatedDoctors: Doctor[];
  loadingRelated: boolean;
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

const initialState: DoctorDetailState = {
  doctor: null,
  reviews: [],
  clinics: [],
  loading: false,
  reviewsLoading: false,
  error: null,
  reviewsError: null,
  activeTab: 'about',
  reviewsPagination: initialPagination,
  isFavorite: false,
  relatedDoctors: [],
  loadingRelated: false,
  lastUpdated: null,
};

// ── Async Thunks ────────────────────────────

export const fetchDoctorDetail = createAsyncThunk<
  Doctor,
  string,
  { rejectValue: string }
>('doctorDetail/fetchDoctorDetail', async (doctorId, { rejectWithValue }) => {
  try {
    const res = await fetchDoctorByIdApi(doctorId);

    if (res.success) {
      return res.data;
    }

    return rejectWithValue(res.message || 'Failed to load doctor profile');
  } catch (error: any) {
    if (error.message?.includes('Network')) {
      return rejectWithValue('No internet connection. Please check your network.');
    }
    return rejectWithValue('Something went wrong. Please try again.');
  }
});

export const fetchDoctorReviews = createAsyncThunk<
  { reviews: DoctorReview[]; pagination: Pagination },
  { doctorId: string; page?: number },
  { rejectValue: string }
>(
  'doctorDetail/fetchDoctorReviews',
  async ({ doctorId, page = 1 }, { rejectWithValue }) => {
    try {
      const res = await fetchDoctorReviewsApi({ doctorId, page, limit: 10 });

      if (res.success) {
        return res.data;
      }

      return rejectWithValue(res.message || 'Failed to load reviews');
    } catch (error: any) {
      return rejectWithValue('Something went wrong');
    }
  }
);

export const fetchRelatedDoctors = createAsyncThunk<
  Doctor[],
  { specialtyId: string; excludeDoctorId: string },
  { rejectValue: string }
>(
  'doctorDetail/fetchRelatedDoctors',
  async ({ specialtyId, excludeDoctorId }, { rejectWithValue }) => {
    try {
      // Assuming there's an API to get related doctors by specialty
      // const res = await fetchDoctorsApi({ specialtyId, limit: 5 });
      // if (res.success) {
      //   return res.data.doctors.filter(d => d.doctorId !== excludeDoctorId);
      // }
      return [];
    } catch (error: any) {
      return rejectWithValue('Failed to load related doctors');
    }
  }
);

export const addToFavorites = createAsyncThunk<
  string, // doctorId
  string,
  { rejectValue: string }
>('doctorDetail/addToFavorites', async (doctorId, { rejectWithValue }) => {
  try {
    // API call to add to favorites
    // await addFavoriteApi(doctorId);
    return doctorId;
  } catch {
    return rejectWithValue('Failed to add to favorites');
  }
});

export const removeFromFavorites = createAsyncThunk<
  string, // doctorId
  string,
  { rejectValue: string }
>('doctorDetail/removeFromFavorites', async (doctorId, { rejectWithValue }) => {
  try {
    // API call to remove from favorites
    // await removeFavoriteApi(doctorId);
    return doctorId;
  } catch {
    return rejectWithValue('Failed to remove from favorites');
  }
});

// ── Slice ───────────────────────────────────

const doctorDetailSlice = createSlice({
  name: 'doctorDetail',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<DetailTab>) {
      state.activeTab = action.payload;
    },

    toggleFavorite(state) {
      state.isFavorite = !state.isFavorite;
    },

    clearDoctor(state) {
      // Reset all state
      Object.assign(state, initialState);
    },

    clearError(state) {
      state.error = null;
      state.reviewsError = null;
    },

    updateDoctor(state, action: PayloadAction<Partial<Doctor>>) {
      if (state.doctor) {
        state.doctor = { ...state.doctor, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Doctor detail
      .addCase(fetchDoctorDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctorDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.doctor = action.payload;
        state.clinics = action.payload.clinics || [];
        state.lastUpdated = Date.now();
      })
      .addCase(fetchDoctorDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load doctor';
      })

      // Reviews
      .addCase(fetchDoctorReviews.pending, (state, action) => {
        state.reviewsLoading = true;
        state.reviewsError = null;
        // Reset reviews if it's the first page
        if (action.meta.arg.page === 1 || !action.meta.arg.page) {
          state.reviews = [];
        }
      })
      .addCase(fetchDoctorReviews.fulfilled, (state, action) => {
        state.reviewsLoading = false;
        const { reviews, pagination } = action.payload;

        if (pagination.currentPage === 1) {
          state.reviews = reviews;
        } else {
          // Append new reviews, avoiding duplicates
          const existingIds = new Set(state.reviews.map((r) => r.reviewId));
          const newReviews = reviews.filter((r) => !existingIds.has(r.reviewId));
          state.reviews = [...state.reviews, ...newReviews];
        }

        state.reviewsPagination = pagination;
      })
      .addCase(fetchDoctorReviews.rejected, (state, action) => {
        state.reviewsLoading = false;
        state.reviewsError = action.payload ?? 'Failed to load reviews';
      })

      // Related doctors
      .addCase(fetchRelatedDoctors.pending, (state) => {
        state.loadingRelated = true;
      })
      .addCase(fetchRelatedDoctors.fulfilled, (state, action) => {
        state.loadingRelated = false;
        state.relatedDoctors = action.payload;
      })
      .addCase(fetchRelatedDoctors.rejected, (state) => {
        state.loadingRelated = false;
      })

      // Favorites
      .addCase(addToFavorites.fulfilled, (state) => {
        state.isFavorite = true;
      })
      .addCase(removeFromFavorites.fulfilled, (state) => {
        state.isFavorite = false;
      });
  },
});

export const {
  setActiveTab,
  toggleFavorite,
  clearDoctor,
  clearError,
  updateDoctor,
} = doctorDetailSlice.actions;

// ── Selectors ───────────────────────────────

export const selectDoctor = (state: RootState) => state.doctorDetail.doctor;

export const selectReviews = (state: RootState) => state.doctorDetail.reviews;

export const selectClinics = (state: RootState) => state.doctorDetail.clinics;

export const selectActiveTab = (state: RootState) => state.doctorDetail.activeTab;

export const selectIsLoading = (state: RootState) => state.doctorDetail.loading;

export const selectIsFavorite = (state: RootState) => state.doctorDetail.isFavorite;

export const selectRelatedDoctors = (state: RootState) =>
  state.doctorDetail.relatedDoctors;

// Get reviews count
export const selectReviewsCount = (state: RootState) =>
  state.doctorDetail.reviews.length;

// Get average rating
export const selectAverageRating = (state: RootState) => {
  const reviews = state.doctorDetail.reviews;
  if (reviews.length === 0) return 0;

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return parseFloat((sum / reviews.length).toFixed(1));
};

// Get rating breakdown
export const selectRatingBreakdown = (state: RootState) => {
  const reviews = state.doctorDetail.reviews;
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, total: reviews.length };

  for (const review of reviews) {
    const key = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[key]++;
  }

  return breakdown;
};

// Get recent reviews (last 7 days)
export const selectRecentReviews = (state: RootState) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.doctorDetail.reviews.filter(
    (r) => new Date(r.createdAt).getTime() > weekAgo
  );
};

// Get reviews with doctor response
export const selectReviewsWithResponse = (state: RootState) =>
  state.doctorDetail.reviews.filter((r) => r.response);

// Get clinic by ID
export const selectClinicById =
  (clinicId: string) =>
  (state: RootState): Clinic | undefined =>
    state.doctorDetail.clinics.find((c) => c.clinicId === clinicId);

// Check if doctor is available today
export const selectIsAvailableToday = (state: RootState): boolean => {
  const clinics = state.doctorDetail.clinics;
  if (clinics.length === 0) return false;

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return clinics.some((clinic) =>
    clinic.timings?.some(
      (t) => t.isOpen && t.day.toLowerCase() === todayName.toLowerCase()
    )
  );
};

// Get next available slot
export const selectNextAvailableSlot = (state: RootState) => {
  const doctor = state.doctorDetail.doctor;
  if (!doctor?.availableSlots || doctor.availableSlots.length === 0) {
    return null;
  }

  const now = new Date();
  const upcoming = doctor.availableSlots
    .filter((slot) => new Date(slot.dateTime) > now)
    .sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

  return upcoming[0] || null;
};

// Get doctor's main specialty
export const selectMainSpecialty = (state: RootState): string => {
  const doctor = state.doctorDetail.doctor;
  if (!doctor) return '';

  return doctor.subspecialties?.[0] || doctor.qualifications?.[0] || 'Specialist';
};

// Get doctor's fee range
export const selectFeeRange = (state: RootState) => {
  const doctor = state.doctorDetail.doctor;
  if (!doctor) return { min: 0, max: 0 };

  const fees = [
    doctor.consultationFee,
    doctor.videoConsultationFee || 0,
  ].filter((f) => f > 0);

  return {
    min: Math.min(...fees),
    max: Math.max(...fees),
    hasVideo: (doctor.videoConsultationFee || 0) > 0,
  };
};

// Check if data needs refresh (after 5 minutes)
export const selectNeedsRefresh = (state: RootState): boolean => {
  const lastUpdated = state.doctorDetail.lastUpdated;
  if (!lastUpdated) return true;

  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - lastUpdated > fiveMinutes;
};

export default doctorDetailSlice.reducer;