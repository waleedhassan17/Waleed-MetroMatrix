import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Doctor } from '../../../../models/healthcare/types';
import type { Pagination } from '../../../../models/serviceProviders/common';
import { fetchDoctorsApi } from '../../../../networks/healthcare/doctorApi';
import type { RootState } from '../../../../store/store';

// ── Filter / Sort Types ─────────────────────

export type GenderFilter = 'any' | 'male' | 'female';
export type AvailabilityFilter = 'any' | 'today' | 'this-week';
export type ConsultationTypeFilter = 'both' | 'in-clinic' | 'video';
export type SortOption = 'relevance' | 'rating' | 'fee-low' | 'fee-high' | 'experience';

export interface DoctorFilters {
  gender: GenderFilter;
  availability: AvailabilityFilter;
  feeRange: [number, number]; // [min, max]
  consultationType: ConsultationTypeFilter;
  city: string;
  minRating?: number;
  languages?: string[];
}

const DEFAULT_FILTERS: DoctorFilters = {
  gender: 'any',
  availability: 'any',
  feeRange: [0, 10000],
  consultationType: 'both',
  city: '',
  minRating: undefined,
  languages: [],
};

// ── State ───────────────────────────────────

export interface DoctorListState {
  doctors: Doctor[];
  filters: DoctorFilters;
  pagination: Pagination;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  sortBy: SortOption;
  selectedSpecialtyId: string | null;
  selectedSpecialtyName: string;
  searchQuery: string;
  // View state
  viewMode: 'list' | 'grid';
  // Cache
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

const initialState: DoctorListState = {
  doctors: [],
  filters: DEFAULT_FILTERS,
  pagination: initialPagination,
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,
  sortBy: 'relevance',
  selectedSpecialtyId: null,
  selectedSpecialtyName: '',
  searchQuery: '',
  viewMode: 'list',
  lastUpdated: null,
};

// ── Helpers ─────────────────────────────────

function mapSortToApi(
  sort: SortOption
): 'rating' | 'experience' | 'fee-low' | 'fee-high' | undefined {
  switch (sort) {
    case 'rating':
      return 'rating';
    case 'experience':
      return 'experience';
    case 'fee-low':
      return 'fee-low';
    case 'fee-high':
      return 'fee-high';
    default:
      return undefined;
  }
}

function filterDoctorsClientSide(
  doctors: Doctor[],
  filters: DoctorFilters
): Doctor[] {
  let result = [...doctors];

  // Fee range filter
  result = result.filter(
    (d) =>
      d.consultationFee >= filters.feeRange[0] &&
      d.consultationFee <= filters.feeRange[1]
  );

  // Consultation type filter
  if (filters.consultationType === 'video') {
    result = result.filter((d) => d.videoConsultationFee > 0);
  } else if (filters.consultationType === 'in-clinic') {
    result = result.filter((d) => d.consultationFee > 0);
  }

  // Gender filter (if doctor has gender field)
  if (filters.gender !== 'any') {
    result = result.filter((d) => {
      // Assuming doctor might have gender in bio or as separate field
      const gender = (d as any).gender?.toLowerCase();
      return gender === filters.gender;
    });
  }

  // Min rating filter
  if (filters.minRating) {
    result = result.filter((d) => d.rating >= filters.minRating!);
  }

  // Language filter
  if (filters.languages && filters.languages.length > 0) {
    result = result.filter((d) =>
      filters.languages!.some((lang) => d.languages?.includes(lang))
    );
  }

  return result;
}

function sortDoctors(doctors: Doctor[], sortBy: SortOption): Doctor[] {
  const sorted = [...doctors];

  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'experience':
      return sorted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    case 'fee-low':
      return sorted.sort(
        (a, b) => (a.consultationFee || 0) - (b.consultationFee || 0)
      );
    case 'fee-high':
      return sorted.sort(
        (a, b) => (b.consultationFee || 0) - (a.consultationFee || 0)
      );
    default:
      return sorted;
  }
}

// ── Async Thunks ────────────────────────────

export const fetchDoctors = createAsyncThunk<
  { doctors: Doctor[]; pagination: Pagination },
  void,
  { state: RootState; rejectValue: string }
>('doctorList/fetchDoctors', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState().doctorList;

    const params: Record<string, any> = {
      page: 1,
      limit: 10,
    };

    if (state.selectedSpecialtyId) {
      params.specialtyId = state.selectedSpecialtyId;
    }
    if (state.filters.city) {
      params.city = state.filters.city;
    }
    if (state.searchQuery) {
      params.search = state.searchQuery;
    }
    if (state.filters.availability !== 'any') {
      params.availableOnly = true;
      if (state.filters.availability === 'today') {
        params.availableToday = true;
      }
    }

    const apiSort = mapSortToApi(state.sortBy);
    if (apiSort) {
      params.sort = apiSort;
    }

    const res = await fetchDoctorsApi(params);

    if (res.success) {
      return res.data;
    }

    return rejectWithValue(res.message || 'Failed to fetch doctors');
  } catch (error: any) {
    if (error.message?.includes('Network')) {
      return rejectWithValue('No internet connection. Please check your network.');
    }
    return rejectWithValue(error.message || 'Failed to fetch doctors');
  }
});

export const loadMore = createAsyncThunk<
  { doctors: Doctor[]; pagination: Pagination } | null,
  void,
  { state: RootState; rejectValue: string }
>('doctorList/loadMore', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState().doctorList;

    if (!state.pagination.hasNext) {
      return null;
    }

    const nextPage = state.pagination.currentPage + 1;

    const params: Record<string, any> = {
      page: nextPage,
      limit: 10,
    };

    if (state.selectedSpecialtyId) {
      params.specialtyId = state.selectedSpecialtyId;
    }
    if (state.filters.city) {
      params.city = state.filters.city;
    }
    if (state.searchQuery) {
      params.search = state.searchQuery;
    }
    if (state.filters.availability !== 'any') {
      params.availableOnly = true;
    }

    const apiSort = mapSortToApi(state.sortBy);
    if (apiSort) {
      params.sort = apiSort;
    }

    const res = await fetchDoctorsApi(params);

    if (res.success) {
      return res.data;
    }

    return rejectWithValue(res.message || 'Failed to load more');
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load more');
  }
});

export const refreshDoctors = createAsyncThunk<
  { doctors: Doctor[]; pagination: Pagination },
  void,
  { state: RootState; rejectValue: string }
>('doctorList/refreshDoctors', async (_, { dispatch }) => {
  return dispatch(fetchDoctors()).unwrap();
});

// ── Slice ───────────────────────────────────

const doctorListSlice = createSlice({
  name: 'doctorList',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<DoctorFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters(state) {
      state.filters = DEFAULT_FILTERS;
    },

    setSorting(state, action: PayloadAction<SortOption>) {
      state.sortBy = action.payload;
    },

    setSelectedSpecialty(
      state,
      action: PayloadAction<{ id: string | null; name?: string }>
    ) {
      state.selectedSpecialtyId = action.payload.id;
      state.selectedSpecialtyName = action.payload.name || '';
    },

    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },

    setViewMode(state, action: PayloadAction<'list' | 'grid'>) {
      state.viewMode = action.payload;
    },

    clearError(state) {
      state.error = null;
    },

    resetDoctorList() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDoctors
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.doctors = action.payload.doctors;
        state.pagination = action.payload.pagination;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Something went wrong';
      })

      // loadMore
      .addCase(loadMore.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(loadMore.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (action.payload) {
          state.doctors = [...state.doctors, ...action.payload.doctors];
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(loadMore.rejected, (state) => {
        state.loadingMore = false;
      })

      // refreshDoctors
      .addCase(refreshDoctors.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshDoctors.fulfilled, (state, action) => {
        state.refreshing = false;
        state.doctors = action.payload.doctors;
        state.pagination = action.payload.pagination;
        state.lastUpdated = Date.now();
      })
      .addCase(refreshDoctors.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload ?? 'Refresh failed';
      });
  },
});

// ── Selectors ───────────────────────────────

// Get filtered and sorted doctors (memoized)
export const selectFilteredDoctors = createSelector(
  (state: { doctorList: DoctorListState }) => state.doctorList.doctors,
  (state: { doctorList: DoctorListState }) => state.doctorList.filters,
  (state: { doctorList: DoctorListState }) => state.doctorList.sortBy,
  (doctors, filters, sortBy) => {
    const filtered = filterDoctorsClientSide(doctors, filters);
    return sortBy !== 'relevance' ? sortDoctors(filtered, sortBy) : filtered;
  }
);

// Get active filter count (memoized)
export const selectActiveFilterCount = createSelector(
  (state: { doctorList: DoctorListState }) => state.doctorList.filters,
  (filters) => {
    let count = 0;
    if (filters.gender !== 'any') count++;
    if (filters.availability !== 'any') count++;
    if (filters.feeRange[0] > 0 || filters.feeRange[1] < 10000) count++;
    if (filters.consultationType !== 'both') count++;
    if (filters.city) count++;
    if (filters.minRating) count++;
    if (filters.languages && filters.languages.length > 0) count++;
    return count;
  }
);

// Get total doctors count
export const selectTotalDoctors = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.pagination.totalItems;
};

// Get loading states
export const selectIsLoading = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.loading;
};

export const selectIsLoadingMore = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.loadingMore;
};

// Get current filters
export const selectCurrentFilters = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.filters;
};

// Get current sort
export const selectCurrentSort = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.sortBy;
};

// Get doctors by rating range
export const selectDoctorsByRating = (minRating: number) => (
  state: { doctorList: DoctorListState }
) => {
  return state.doctorList.doctors.filter((d) => d.rating >= minRating);
};

// Get available doctors
export const selectAvailableDoctors = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.doctors.filter((d) => d.isAvailable);
};

// Get video consultation doctors
export const selectVideoConsultDoctors = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.doctors.filter((d) => d.videoConsultationFee > 0);
};

// Get doctors count by fee range
export const selectDoctorCountByFeeRange = (state: { doctorList: DoctorListState }) => {
  const doctors = state.doctorList.doctors;

  return {
    under1000: doctors.filter((d) => d.consultationFee < 1000).length,
    '1000to2000': doctors.filter(
      (d) => d.consultationFee >= 1000 && d.consultationFee < 2000
    ).length,
    '2000to3000': doctors.filter(
      (d) => d.consultationFee >= 2000 && d.consultationFee < 3000
    ).length,
    over3000: doctors.filter((d) => d.consultationFee >= 3000).length,
  };
};

// Check if has more pages
export const selectHasMore = (state: { doctorList: DoctorListState }) => {
  return state.doctorList.pagination.hasNext;
};

// ── Exports ─────────────────────────────────

export const {
  setFilters,
  clearFilters,
  setSorting,
  setSelectedSpecialty,
  setSearchQuery,
  setViewMode,
  clearError,
  resetDoctorList,
} = doctorListSlice.actions;

export default doctorListSlice.reducer;