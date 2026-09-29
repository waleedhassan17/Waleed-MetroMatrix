import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { Provider, Pagination } from '../../../../models/serviceProviders';
import { providerListSerializer, paginationSerializer } from '../../../../serializers/serviceProviders';
import { fetchProviders } from '../../../../networks/serviceProviders/providerNetwork';

// Types
export type SortOption = 'rating' | 'reviews' | 'experience' | 'price';
export type ProviderCategory = 'electricians' | 'plumbers' | 'ac-repairers';

export interface FilterOptions {
  minRating?: number;
  maxPrice?: number;
  verified?: boolean;
  available?: boolean;
}

export interface ProvidersState {
  // Provider lists by category
  electricians: Provider[];
  plumbers: Provider[];
  acRepairers: Provider[];
  
  // Current active providers (filtered/sorted)
  filteredProviders: Provider[];
  
  // Current category
  currentCategory: ProviderCategory;
  
  // Search and filter state
  searchQuery: string;
  selectedSort: SortOption;
  filters: FilterOptions;
  
  // Pagination
  pagination: Pagination;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // Selected provider for detail view
  selectedProvider: Provider | null;
}

// Note: Dummy data is now provided by the network layer (USE_DUMMY_DATA flag in network.ts)
// The slice uses fetchProviders API which returns dummy data when backend is not ready

// Initial state
const initialState: ProvidersState = {
  electricians: [],
  plumbers: [],
  acRepairers: [],
  filteredProviders: [],
  currentCategory: 'electricians',
  searchQuery: '',
  selectedSort: 'rating',
  filters: {},
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
    hasNext: false,
    hasPrevious: false,
  },
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  selectedProvider: null,
};

// Helper function to sort providers
const sortProviders = (providers: Provider[], sortBy: SortOption): Provider[] => {
  const sorted = [...providers];
  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'reviews':
      return sorted.sort((a, b) => b.reviews - a.reviews);
    case 'experience':
      return sorted.sort((a, b) => {
        const aYears = parseInt(a.experience) || 0;
        const bYears = parseInt(b.experience) || 0;
        return bYears - aYears;
      });
    case 'price':
      return sorted.sort((a, b) => a.price - b.price);
    default:
      return sorted;
  }
};

// Helper function to filter providers by search query
const filterBySearch = (providers: Provider[], query: string): Provider[] => {
  if (!query.trim()) return providers;
  const lowercaseQuery = query.toLowerCase();
  return providers.filter(
    (p) =>
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.specialty?.toLowerCase().includes(lowercaseQuery) ||
      p.experience.toLowerCase().includes(lowercaseQuery)
  );
};

/**
 * THE UNFILTERED list for the current category — the one `filteredProviders` is
 * always derived FROM, never the previous value of `filteredProviders` itself.
 *
 * Searching used to narrow `filteredProviders` in place, which made every
 * keystroke destructive: the providers it pruned were gone from state, so
 * clearing the box could only ever return whatever survived the last query.
 * `filterBySearch('')` correctly returns its input unchanged — the input was
 * simply already wrong. Only a refetch rebuilt the list, which is why leaving
 * the screen and coming back appeared to fix it.
 */
const sourceFor = (state: ProvidersState): Provider[] => {
  switch (state.currentCategory) {
    case 'electricians':
      return state.electricians;
    case 'plumbers':
      return state.plumbers;
    case 'ac-repairers':
      return state.acRepairers;
    default:
      return [];
  }
};

/** Re-derive the visible list from the category list + current query + sort. */
const reapply = (state: ProvidersState) => {
  state.filteredProviders = sortProviders(
    filterBySearch(sourceFor(state), state.searchQuery),
    state.selectedSort
  );
};

// Slice using createAppSlice
const providersSlice = createAppSlice({
  name: 'serviceProviders',
  initialState,
  reducers: (create) => ({
    // Fetch providers by category
    fetchProvidersByCategory: create.asyncThunk(
      async (params: {
        category: ProviderCategory;
        search?: string;
        sort?: SortOption;
        filters?: FilterOptions;
        page?: number;
      }, { rejectWithValue }) => {
        const response = await fetchProviders({
          category: params.category,
          search: params.search,
          page: params.page || 1,
          limit: 15,
          sort: params.sort,
          filters: params.filters,
        });

        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to fetch providers');
        }

        return {
          providers: providerListSerializer(response.data),
          pagination: paginationSerializer(response.data.pagination),
          category: params.category,
        };
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          const { providers, pagination, category } = action.payload;

          // Store in category-specific array
          switch (category) {
            case 'electricians':
              state.electricians = providers;
              break;
            case 'plumbers':
              state.plumbers = providers;
              break;
            case 'ac-repairers':
              state.acRepairers = providers;
              break;
          }

          state.pagination = pagination;
          // Set BEFORE reapply: sourceFor reads currentCategory.
          state.currentCategory = category;
          reapply(state);
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string || 'Failed to fetch providers';
        },
      }
    ),

    // Refresh providers
    refreshProviders: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        const state = (getState() as any).serviceProviders as ProvidersState;
        const { currentCategory, searchQuery, selectedSort, filters } = state;

        const response = await fetchProviders({
          category: currentCategory,
          search: searchQuery || undefined,
          page: 1,
          limit: 15,
          sort: selectedSort,
          filters,
        });

        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to refresh providers');
        }

        return {
          providers: providerListSerializer(response.data),
          pagination: paginationSerializer(response.data.pagination),
          category: currentCategory,
        };
      },
      {
        pending: (state) => {
          state.isRefreshing = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isRefreshing = false;
          const { providers, pagination, category } = action.payload;

          switch (category) {
            case 'electricians':
              state.electricians = providers;
              break;
            case 'plumbers':
              state.plumbers = providers;
              break;
            case 'ac-repairers':
              state.acRepairers = providers;
              break;
          }

          state.pagination = pagination;
          reapply(state);
        },
        rejected: (state, action) => {
          state.isRefreshing = false;
          state.error = action.payload as string || 'Failed to refresh providers';
        },
      }
    ),

    // Load more providers (pagination)
    loadMoreProviders: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        const state = (getState() as any).serviceProviders as ProvidersState;
        const { currentCategory, searchQuery, selectedSort, filters, pagination } = state;

        if (!pagination.hasNext) {
          return rejectWithValue('No more providers to load');
        }

        const response = await fetchProviders({
          category: currentCategory,
          search: searchQuery || undefined,
          page: pagination.currentPage + 1,
          limit: 15,
          sort: selectedSort,
          filters,
        });

        if (!response.success) {
          return rejectWithValue(response.message || 'Failed to load more providers');
        }

        return {
          providers: providerListSerializer(response.data),
          pagination: paginationSerializer(response.data.pagination),
        };
      },
      {
        pending: (state) => {
          state.isLoadingMore = true;
        },
        fulfilled: (state, action) => {
          state.isLoadingMore = false;
          // Append to the CATEGORY list, not just the visible one. Appending
          // only to `filteredProviders` was survivable while that array was
          // mutated in place, but `reapply` rebuilds from the category list —
          // so a page that never landed there would vanish the next time the
          // query or sort changed. Ids are de-duplicated because a provider
          // whose rating shifted between requests can arrive on two pages.
          const seen = new Set(sourceFor(state).map((p) => p.id));
          const added = action.payload.providers.filter((p) => !seen.has(p.id));
          switch (state.currentCategory) {
            case 'electricians':
              state.electricians.push(...added);
              break;
            case 'plumbers':
              state.plumbers.push(...added);
              break;
            case 'ac-repairers':
              state.acRepairers.push(...added);
              break;
          }
          state.pagination = action.payload.pagination;
          reapply(state);
        },
        rejected: (state, action) => {
          state.isLoadingMore = false;
          state.error = action.payload as string || 'Failed to load more providers';
        },
      }
    ),

    // Sync reducers
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      reapply(state);
    }),

    setSelectedSort: create.reducer((state, action: PayloadAction<SortOption>) => {
      state.selectedSort = action.payload;
      reapply(state);
    }),

    setFilters: create.reducer((state, action: PayloadAction<FilterOptions>) => {
      state.filters = action.payload;
    }),

    setCategory: create.reducer((state, action: PayloadAction<ProviderCategory>) => {
      state.currentCategory = action.payload;
      // The category IS what sourceFor reads, so the visible list has to follow
      // it — otherwise switching category leaves the previous trade's providers
      // on screen until a fetch lands. (No screen dispatches this today; the
      // category arrives as a route param and is set by the fetch. Keeping it
      // consistent means it stays correct for whoever reaches for it next.)
      reapply(state);
    }),

    clearSearch: create.reducer((state) => {
      state.searchQuery = '';
      reapply(state);
    }),

    clearSelectedProvider: create.reducer((state) => {
      state.selectedProvider = null;
    }),

    clearError: create.reducer((state) => {
      state.error = null;
    }),

    resetProviders: create.reducer((state) => {
      state.filteredProviders = [];
      state.searchQuery = '';
      state.selectedSort = 'rating';
      state.filters = {};
      state.error = null;
    }),
  }),
  selectors: {
    selectElectricians: (state) => state.electricians,
    selectPlumbers: (state) => state.plumbers,
    selectACRepairers: (state) => state.acRepairers,
    selectFilteredProviders: (state) => state.filteredProviders,
    selectCurrentCategory: (state) => state.currentCategory,
    selectSearchQuery: (state) => state.searchQuery,
    selectSelectedSort: (state) => state.selectedSort,
    selectFilters: (state) => state.filters,
    selectPagination: (state) => state.pagination,
    selectIsLoading: (state) => state.isLoading,
    selectIsRefreshing: (state) => state.isRefreshing,
    selectIsLoadingMore: (state) => state.isLoadingMore,
    selectProvidersError: (state) => state.error,
    selectSelectedProvider: (state) => state.selectedProvider,
  },
});

// Actions
export const {
  fetchProvidersByCategory,
  refreshProviders,
  loadMoreProviders,
  setSearchQuery,
  setSelectedSort,
  setFilters,
  setCategory,
  clearSearch,
  clearSelectedProvider,
  clearError,
  resetProviders,
} = providersSlice.actions;

// Selectors
export const {
  selectElectricians,
  selectPlumbers,
  selectACRepairers,
  selectFilteredProviders,
  selectCurrentCategory,
  selectSearchQuery,
  selectSelectedSort,
  selectFilters,
  selectPagination,
  selectIsLoading,
  selectIsRefreshing,
  selectIsLoadingMore,
  selectProvidersError,
  selectSelectedProvider,
} = providersSlice.selectors;

// Get provider by ID from local state
export const selectProviderById = (id: string, category: ProviderCategory) =>
  (state: { serviceProviders: ProvidersState }) => {
    switch (category) {
      case 'electricians':
        return state.serviceProviders.electricians.find((p) => p.id === id);
      case 'plumbers':
        return state.serviceProviders.plumbers.find((p) => p.id === id);
      case 'ac-repairers':
        return state.serviceProviders.acRepairers.find((p) => p.id === id);
      default:
        return undefined;
    }
  };

// Legacy action wrappers for backward compatibility
export const fetchElectricians = () => fetchProvidersByCategory({ category: 'electricians' });
export const fetchPlumbers = () => fetchProvidersByCategory({ category: 'plumbers' });
export const fetchACRepairers = () => fetchProvidersByCategory({ category: 'ac-repairers' });

export default providersSlice.reducer;