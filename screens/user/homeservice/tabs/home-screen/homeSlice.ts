import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../../store/createAppSlice';
import {
  fetchHomeData as fetchHomeDataApi,
  ServiceCategory,
  Promotion,
} from '../../../../../networks/serviceProviders/homeNetwork';

// Re-export types for consumers
export type { ServiceCategory, Promotion };

interface HomeState {
  categories: ServiceCategory[];
  promotions: Promotion[];
  selectedCategories: string[];
  activePromoIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
}

// Initial State
const initialState: HomeState = {
  categories: [],
  promotions: [],
  selectedCategories: [],
  activePromoIndex: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  searchQuery: '',
};

// Slice
const homeSlice = createAppSlice({
  name: 'home',
  initialState,
  reducers: (create) => ({
    // Async Thunks
    fetchHomeData: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          const response = await fetchHomeDataApi();
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to fetch home data.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to fetch home data.');
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.categories = action.payload.categories;
          state.promotions = action.payload.promotions;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string;
        },
      }
    ),

    refreshHomeData: create.asyncThunk(
      async (_, { rejectWithValue }) => {
        try {
          const response = await fetchHomeDataApi();
          if (!response.success) {
            return rejectWithValue(response.message || 'Failed to refresh home data.');
          }
          return response.data;
        } catch (error) {
          return rejectWithValue('Failed to refresh home data.');
        }
      },
      {
        pending: (state) => {
          state.isRefreshing = true;
        },
        fulfilled: (state, action) => {
          state.isRefreshing = false;
          state.categories = action.payload.categories;
          state.promotions = action.payload.promotions;
        },
        rejected: (state, action) => {
          state.isRefreshing = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync reducers
    selectCategory: create.reducer((state, action: PayloadAction<string>) => {
      const categoryId = action.payload;
      if (state.selectedCategories.includes(categoryId)) {
        state.selectedCategories = state.selectedCategories.filter(
          (id) => id !== categoryId
        );
      } else {
        state.selectedCategories.push(categoryId);
      }
    }),

    setSingleCategory: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedCategories = [action.payload];
    }),

    clearSelectedCategories: create.reducer((state) => {
      state.selectedCategories = [];
    }),

    setActivePromoIndex: create.reducer((state, action: PayloadAction<number>) => {
      state.activePromoIndex = action.payload;
    }),

    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectCategories: (state) => state.categories,
    selectPromotions: (state) => state.promotions,
    selectSelectedCategories: (state) => state.selectedCategories,
    selectActivePromoIndex: (state) => state.activePromoIndex,
    selectIsLoading: (state) => state.isLoading,
    selectIsRefreshing: (state) => state.isRefreshing,
    selectHomeError: (state) => state.error,
    selectHomeSearchQuery: (state) => state.searchQuery,
  },
});

// Actions
export const {
  fetchHomeData,
  refreshHomeData,
  selectCategory,
  setSingleCategory,
  clearSelectedCategories,
  setActivePromoIndex,
  setSearchQuery,
  clearError,
} = homeSlice.actions;

// Selectors
export const {
  selectCategories,
  selectPromotions,
  selectSelectedCategories,
  selectActivePromoIndex,
  selectIsLoading,
  selectIsRefreshing,
  selectHomeError,
  selectHomeSearchQuery,
} = homeSlice.selectors;

// Computed selectors
export const selectFilteredCategories = (state: { home: HomeState }) => {
  const { categories, searchQuery } = state.home;
  if (!searchQuery) return categories;

  const query = searchQuery.toLowerCase();
  return categories.filter(
    (category) =>
      category.name.toLowerCase().includes(query) ||
      category.badge.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query)
  );
};

export const selectCategoryById = (categoryId: string) => (state: { home: HomeState }) =>
  state.home.categories.find((cat) => cat.id === categoryId);

export default homeSlice.reducer;