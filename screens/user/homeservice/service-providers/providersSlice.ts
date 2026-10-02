import { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../../../store/createAppSlice';
import { Provider, Pagination } from '../../../../models/serviceProviders';
import { providerListSerializer, paginationSerializer } from '../../../../serializers/serviceProviders';
import {
  fetchProviders,
  ProviderSearchArea,
  ProviderSearchFilters,
  ProviderSort,
  SearchOrigin,
} from '../../../../networks/serviceProviders/providerNetwork';

// ============================================================================
// Provider discovery state.
//
// The SERVER ranks, searches and filters (GET /providers → $geoNear + the
// matching score in the backend's services/discoveryPipeline.js). This slice
// keeps exactly what the server returned, in its order, page after page.
//
// It used to re-sort every response on the phone by star rating, which threw
// the distance/availability ranking away; send only `category`, so sort and
// filters never reached the server; and fetch one page, so a customer only
// ever saw the first fifteen providers.
// ============================================================================

export type SortOption = ProviderSort;
export type ProviderCategory = 'electricians' | 'plumbers' | 'ac-repairers';
export type FilterOptions = ProviderSearchFilters;

export interface ProvidersState {
  // Provider lists by category (server order, accumulated across pages)
  electricians: Provider[];
  plumbers: Provider[];
  acRepairers: Provider[];

  // The current category's list — what the screen renders.
  filteredProviders: Provider[];

  currentCategory: ProviderCategory;

  // What was asked for; every change refetches page 1.
  searchQuery: string;
  selectedSort: SortOption;
  filters: FilterOptions;

  pagination: Pagination;
  /** How the server interpreted "near you" for the last request. */
  searchArea: ProviderSearchArea | null;
  /** The position the last search was measured from, if any. */
  origin: SearchOrigin | null;

  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;

  selectedProvider: Provider | null;
}

const initialState: ProvidersState = {
  electricians: [],
  plumbers: [],
  acRepairers: [],
  filteredProviders: [],
  currentCategory: 'electricians',
  searchQuery: '',
  selectedSort: 'best',
  filters: {},
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
    hasNext: false,
    hasPrevious: false,
  },
  searchArea: null,
  origin: null,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  selectedProvider: null,
};

const PAGE_SIZE = 15;

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

const setCategoryList = (state: ProvidersState, category: ProviderCategory, list: Provider[]) => {
  switch (category) {
    case 'electricians':
      state.electricians = list;
      break;
    case 'plumbers':
      state.plumbers = list;
      break;
    case 'ac-repairers':
      state.acRepairers = list;
      break;
  }
};

/** The visible list IS the category list — server order, never re-sorted here. */
const reapply = (state: ProvidersState) => {
  state.filteredProviders = sourceFor(state);
};

type SearchArgs = {
  category: ProviderCategory;
  search?: string;
  sort?: SortOption;
  filters?: FilterOptions;
  page?: number;
};

async function runSearch(args: SearchArgs) {
  const response = await fetchProviders({
    category: args.category,
    search: args.search?.trim() || undefined,
    page: args.page || 1,
    limit: PAGE_SIZE,
    sort: args.sort,
    filters: args.filters,
  });
  if (!response.success) return { ok: false as const, message: response.message };
  return {
    ok: true as const,
    providers: providerListSerializer(response.data),
    pagination: paginationSerializer(response.data.pagination),
    searchArea: response.data.searchArea ?? null,
    origin: response.origin ?? null,
    category: args.category,
  };
}

const providersSlice = createAppSlice({
  name: 'serviceProviders',
  initialState,
  reducers: (create) => ({
    /**
     * Page 1 for a category with the current (or given) search, sort and
     * filters. Arguments that are omitted are taken from state, so the screen
     * can refetch after any single change.
     */
    fetchProvidersByCategory: create.asyncThunk(
      async (params: SearchArgs, { getState, rejectWithValue }) => {
        const state = (getState() as any).serviceProviders as ProvidersState;
        const result = await runSearch({
          category: params.category,
          search: params.search ?? state.searchQuery,
          sort: params.sort ?? state.selectedSort,
          filters: params.filters ?? state.filters,
          page: 1,
        });
        if (!result.ok) return rejectWithValue(result.message || 'Failed to fetch providers');
        return result;
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          const { providers, pagination, category, searchArea, origin } = action.payload;
          setCategoryList(state, category, providers);
          state.pagination = pagination;
          state.searchArea = searchArea;
          state.origin = origin;
          // Set BEFORE reapply: sourceFor reads currentCategory.
          state.currentCategory = category;
          reapply(state);
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = (action.payload as string) || 'Failed to fetch providers';
        },
      }
    ),

    /** Pull-to-refresh: page 1 again with everything as it is. */
    refreshProviders: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        const state = (getState() as any).serviceProviders as ProvidersState;
        const result = await runSearch({
          category: state.currentCategory,
          search: state.searchQuery,
          sort: state.selectedSort,
          filters: state.filters,
          page: 1,
        });
        if (!result.ok) return rejectWithValue(result.message || 'Failed to refresh providers');
        return result;
      },
      {
        pending: (state) => {
          state.isRefreshing = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isRefreshing = false;
          const { providers, pagination, category, searchArea, origin } = action.payload;
          setCategoryList(state, category, providers);
          state.pagination = pagination;
          state.searchArea = searchArea;
          state.origin = origin;
          reapply(state);
        },
        rejected: (state, action) => {
          state.isRefreshing = false;
          state.error = (action.payload as string) || 'Failed to refresh providers';
        },
      }
    ),

    /** The next page, appended — the list's onEndReached. */
    loadMoreProviders: create.asyncThunk(
      async (_, { getState, rejectWithValue }) => {
        const state = (getState() as any).serviceProviders as ProvidersState;
        const result = await runSearch({
          category: state.currentCategory,
          search: state.searchQuery,
          sort: state.selectedSort,
          filters: state.filters,
          page: state.pagination.currentPage + 1,
        });
        if (!result.ok) return rejectWithValue(result.message || 'Failed to load more providers');
        return result;
      },
      {
        // Checked BEFORE `pending` is dispatched — inside the payload creator
        // isLoadingMore is already true, which made every load-more refuse itself.
        options: {
          condition: (_arg, { getState }) => {
            const s = (getState() as any).serviceProviders as ProvidersState;
            return s.pagination.hasNext && !s.isLoadingMore && !s.isLoading;
          },
        },
        pending: (state) => {
          state.isLoadingMore = true;
        },
        fulfilled: (state, action) => {
          state.isLoadingMore = false;
          if (action.payload.category !== state.currentCategory) return; // the customer moved on
          // De-duplicated: a provider whose score shifted between requests can
          // arrive on two pages.
          const seen = new Set(sourceFor(state).map((p) => p.id));
          const added = action.payload.providers.filter((p) => !seen.has(p.id));
          setCategoryList(state, state.currentCategory, [...sourceFor(state), ...added]);
          state.pagination = action.payload.pagination;
          reapply(state);
        },
        rejected: (state, action) => {
          state.isLoadingMore = false;
          state.error = (action.payload as string) || 'Failed to load more providers';
        },
      }
    ),

    // The screen debounces typing and refetches; this only records the text.
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),

    setSelectedSort: create.reducer((state, action: PayloadAction<SortOption>) => {
      state.selectedSort = action.payload;
    }),

    setFilters: create.reducer((state, action: PayloadAction<FilterOptions>) => {
      state.filters = action.payload;
    }),

    setCategory: create.reducer((state, action: PayloadAction<ProviderCategory>) => {
      state.currentCategory = action.payload;
      reapply(state);
    }),

    clearSearch: create.reducer((state) => {
      state.searchQuery = '';
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
      state.selectedSort = 'best';
      state.filters = {};
      state.error = null;
      state.searchArea = null;
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
    selectSearchArea: (state) => state.searchArea,
    selectSearchOrigin: (state) => state.origin,
    selectIsLoading: (state) => state.isLoading,
    selectIsRefreshing: (state) => state.isRefreshing,
    selectIsLoadingMore: (state) => state.isLoadingMore,
    selectProvidersError: (state) => state.error,
    selectSelectedProvider: (state) => state.selectedProvider,
  },
});

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
  selectSearchArea,
  selectSearchOrigin,
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

export default providersSlice.reducer;
