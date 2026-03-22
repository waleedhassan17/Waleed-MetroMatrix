import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Doctor } from '../../../../models/healthcare/types';
import { fetchDoctorsApi } from '../../../../networks/healthcare/doctorApi';
import type { RootState } from '../../../../store/store';

// ── Constants ───────────────────────────────

const RECENT_SEARCHES_KEY = '@healthcare/recent_searches';
const MAX_RECENT_SEARCHES = 10;

// ── State ───────────────────────────────────

export interface DoctorSearchState {
  searchQuery: string;
  results: Doctor[];
  recentSearches: string[];
  popularSearches: string[];
  loading: boolean;
  error: string | null;
  // Filters
  filters: {
    specialtyId: string | null;
    minRating: number | null;
    maxFee: number | null;
    availableToday: boolean;
    gender: 'male' | 'female' | null;
  };
  // Search metadata
  totalResults: number;
  searchTimestamp: number | null;
  lastSearchQuery: string;
}

const initialFilters = {
  specialtyId: null,
  minRating: null,
  maxFee: null,
  availableToday: false,
  gender: null,
};

const initialState: DoctorSearchState = {
  searchQuery: '',
  results: [],
  recentSearches: [],
  popularSearches: [
    'Cardiologist',
    'Dermatologist',
    'General Physician',
    'Pediatrician',
    'Orthopedic',
    'Gynecologist',
  ],
  loading: false,
  error: null,
  filters: initialFilters,
  totalResults: 0,
  searchTimestamp: null,
  lastSearchQuery: '',
};

// ── Async Thunks ────────────────────────────

export const searchDoctors = createAsyncThunk<
  { doctors: Doctor[]; total: number },
  string,
  { state: RootState; rejectValue: string }
>('doctorSearch/searchDoctors', async (query, { getState, rejectWithValue }) => {
  if (!query.trim()) {
    return { doctors: [], total: 0 };
  }

  try {
    const { filters } = getState().doctorSearch;

    const params: Record<string, any> = {
      search: query.trim(),
      limit: 20,
    };

    // Apply filters
    if (filters.specialtyId) params.specialtyId = filters.specialtyId;
    if (filters.minRating) params.minRating = filters.minRating;
    if (filters.maxFee) params.maxFee = filters.maxFee;
    if (filters.availableToday) params.availableToday = true;
    if (filters.gender) params.gender = filters.gender;

    const res = await fetchDoctorsApi(params);

    if (res.success) {
      return {
        doctors: res.data.doctors,
        total: res.data.pagination?.totalItems ?? res.data.doctors.length,
      };
    }

    return rejectWithValue(res.message || 'Search failed');
  } catch (error: any) {
    if (error.message?.includes('Network')) {
      return rejectWithValue('No internet connection. Please check your network.');
    }
    return rejectWithValue('Something went wrong. Please try again.');
  }
});

export const loadRecentSearches = createAsyncThunk<
  string[],
  void,
  { rejectValue: string }
>('doctorSearch/loadRecentSearches', async (_, { rejectWithValue }) => {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch {
    return rejectWithValue('Failed to load recent searches');
  }
});

export const persistRecentSearches = createAsyncThunk<
  void,
  string[],
  { rejectValue: string }
>('doctorSearch/persistRecentSearches', async (searches, { rejectWithValue }) => {
  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    return rejectWithValue('Failed to save recent searches');
  }
});

// ── Slice ───────────────────────────────────

const doctorSearchSlice = createSlice({
  name: 'doctorSearch',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      // Clear results if query is empty
      if (!action.payload.trim()) {
        state.results = [];
        state.totalResults = 0;
      }
    },

    addRecentSearch(state, action: PayloadAction<string>) {
      const term = action.payload.trim();
      if (!term) return;

      // Remove duplicate then prepend, cap at max
      state.recentSearches = [
        term,
        ...state.recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
    },

    removeRecentSearch(state, action: PayloadAction<string>) {
      state.recentSearches = state.recentSearches.filter(
        (s) => s.toLowerCase() !== action.payload.toLowerCase()
      );
    },

    clearRecentSearches(state) {
      state.recentSearches = [];
    },

    setFilter<K extends keyof DoctorSearchState['filters']>(
      state: DoctorSearchState,
      action: PayloadAction<{ key: K; value: DoctorSearchState['filters'][K] }>
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },

    setFilters(
      state,
      action: PayloadAction<Partial<DoctorSearchState['filters']>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters(state) {
      state.filters = initialFilters;
    },

    resetSearch(state) {
      state.searchQuery = '';
      state.results = [];
      state.error = null;
      state.totalResults = 0;
      state.lastSearchQuery = '';
    },

    clearError(state) {
      state.error = null;
    },

    setResults(state, action: PayloadAction<Doctor[]>) {
      state.results = action.payload;
      state.totalResults = action.payload.length;
    },
  },
  extraReducers: (builder) => {
    builder
      // searchDoctors
      .addCase(searchDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload.doctors;
        state.totalResults = action.payload.total;
        state.searchTimestamp = Date.now();
        state.lastSearchQuery = state.searchQuery;
      })
      .addCase(searchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Search failed';
      })

      // loadRecentSearches
      .addCase(loadRecentSearches.fulfilled, (state, action) => {
        state.recentSearches = action.payload;
      });
  },
});

export const {
  setSearchQuery,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  setFilter,
  setFilters,
  clearFilters,
  resetSearch,
  clearError,
  setResults,
} = doctorSearchSlice.actions;

// ── Selectors ───────────────────────────────

export const selectSearchResults = (state: RootState) =>
  state.doctorSearch.results;

export const selectRecentSearches = (state: RootState) =>
  state.doctorSearch.recentSearches;

export const selectPopularSearches = (state: RootState) =>
  state.doctorSearch.popularSearches;

export const selectSearchQuery = (state: RootState) =>
  state.doctorSearch.searchQuery;

export const selectIsSearching = (state: RootState) =>
  state.doctorSearch.loading;

export const selectSearchError = (state: RootState) =>
  state.doctorSearch.error;

export const selectFilters = (state: RootState) =>
  state.doctorSearch.filters;

export const selectHasActiveFilters = (state: RootState) => {
  const { filters } = state.doctorSearch;
  return (
    filters.specialtyId !== null ||
    filters.minRating !== null ||
    filters.maxFee !== null ||
    filters.availableToday ||
    filters.gender !== null
  );
};

export const selectTotalResults = (state: RootState) =>
  state.doctorSearch.totalResults;

// Search suggestions based on query
export const selectSearchSuggestions = (state: RootState) => {
  const { searchQuery, recentSearches, popularSearches } = state.doctorSearch;
  const query = searchQuery.toLowerCase().trim();

  if (!query) return [];

  // Combine and filter matching suggestions
  const all = [...new Set([...recentSearches, ...popularSearches])];
  return all
    .filter((s) => s.toLowerCase().includes(query))
    .slice(0, 5);
};

// Get sorted results by relevance
export const selectSortedResults = (sortBy: 'rating' | 'experience' | 'fee') => (
  state: RootState
) => {
  const results = [...state.doctorSearch.results];

  switch (sortBy) {
    case 'rating':
      return results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'experience':
      return results.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    case 'fee':
      return results.sort(
        (a, b) => (a.consultationFee || 0) - (b.consultationFee || 0)
      );
    default:
      return results;
  }
};

export default doctorSearchSlice.reducer;