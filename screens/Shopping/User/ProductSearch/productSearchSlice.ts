import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Category, Product } from '../../../../types/shopping';
import { searchProductsApi } from '../../../../networks/shopping/productApi';
import { fetchBrandCategoriesApi } from '../../../../networks/shopping/brandApi';

// ── Popular searches ────────────────────────

/**
 * Fallback only. The live list is the storefront's own category tree (see
 * fetchPopularSearches) — these are the apparel terms the catalogue actually
 * carries, so a tap always lands on results. The previous list advertised
 * Watches / Headphones / Perfume, none of which exist in the collection, so
 * every one of those chips returned "No results found".
 */
const POPULAR_SEARCHES = [
  'T-Shirts', 'Jeans', 'Hoodies', 'Dresses',
  'Shirts', 'Jackets', 'Sneakers', 'Backpacks',
];

/**
 * Flattens the 2-level category tree to the leaf names shoppers search by.
 *
 * De-duplicated case-insensitively: the same garment legitimately hangs under
 * more than one parent (Men > Trousers and Women > Trousers), and a flat
 * search term cannot carry the parent, so "Trousers" twice would be two chips
 * that run the identical query — and React rejects the repeated key.
 */
const flattenCategoryNames = (categories: Category[]): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();

  const take = (name?: string) => {
    const label = name?.trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(label);
  };

  categories.forEach((c) => {
    if (c.children?.length) {
      c.children.forEach((child) => take(child.name));
    } else {
      take(c.name);
    }
  });
  return names;
};

// ── State Interface ─────────────────────────

export interface ProductSearchState {
  searchQuery: string;
  results: Product[];
  recentSearches: string[];
  popularSearches: string[];
  suggestions: string[];
  loading: boolean;
  suggestionsLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const initialState: ProductSearchState = {
  searchQuery: '',
  results: [],
  recentSearches: [],
  popularSearches: POPULAR_SEARCHES,
  suggestions: [],
  loading: false,
  suggestionsLoading: false,
  error: null,
  hasSearched: false,
  page: 1,
  totalPages: 1,
  hasMore: false,
};

// ── Async Thunks ────────────────────────────

export const searchProducts = createAsyncThunk(
  'productSearch/searchProducts',
  async (
    { query, page = 1, brandId }: { query: string; page?: number; brandId?: string },
    { rejectWithValue }
  ) => {
    try {
      if (!query.trim()) {
        return { results: [], page: 1, totalPages: 1, query };
      }

      const res = await searchProductsApi(query, { brandId, page, limit: 20 });

      if (!res.success) {
        return rejectWithValue('Search failed');
      }

      return {
        results: res.data,
        page: res.pagination.page,
        totalPages: res.pagination.pages,
        query,
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Search failed.');
    }
  }
);

export const fetchSuggestions = createAsyncThunk(
  'productSearch/fetchSuggestions',
  async (
    { query, brandId }: { query: string; brandId?: string },
    { rejectWithValue }
  ) => {
    try {
      if (!query.trim() || query.length < 2) {
        return [];
      }

      // Scoped to the storefront being browsed — an unscoped call suggested
      // products from other brands that the results list would never show.
      const res = await searchProductsApi(query, { brandId, limit: 5 });
      if (res.success) {
        return res.data.map((p: Product) => p.name).slice(0, 5);
      }
      return [];
    } catch {
      return [];
    }
  }
);

/** Popular searches taken from the storefront's real category tree. */
export const fetchPopularSearches = createAsyncThunk(
  'productSearch/fetchPopularSearches',
  async (brandId: string | undefined) => {
    if (!brandId) return POPULAR_SEARCHES;
    try {
      const res = await fetchBrandCategoriesApi(brandId);
      const names = res.success ? flattenCategoryNames(res.data) : [];
      return names.length > 0 ? names.slice(0, 8) : POPULAR_SEARCHES;
    } catch {
      return POPULAR_SEARCHES;
    }
  }
);

// ── Slice ───────────────────────────────────

const productSearchSlice = createSlice({
  name: 'productSearch',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      if (!action.payload.trim()) {
        state.results = [];
        state.hasSearched = false;
        state.suggestions = [];
      }
    },
    addRecentSearch(state, action: PayloadAction<string>) {
      const query = action.payload.trim();
      if (!query) return;
      // Remove if already exists, add to front, cap at 10
      state.recentSearches = [
        query,
        ...state.recentSearches.filter((s) => s !== query),
      ].slice(0, 10);
    },
    /** Drops results but keeps what the shopper has typed so far. */
    clearResults(state) {
      state.results = [];
      state.suggestions = [];
      state.hasSearched = false;
      state.error = null;
      state.page = 1;
      state.hasMore = false;
    },
    removeRecentSearch(state, action: PayloadAction<string>) {
      state.recentSearches = state.recentSearches.filter((s) => s !== action.payload);
    },
    clearRecentSearches(state) {
      state.recentSearches = [];
    },
    resetSearch(state) {
      state.searchQuery = '';
      state.results = [];
      state.suggestions = [];
      state.hasSearched = false;
      state.error = null;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // searchProducts
      .addCase(searchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        const { results, page, totalPages, query } = action.payload;

        // Debounced typing puts several searches in flight at once and they do
        // not necessarily resolve in order — a slow response for "shi" landing
        // after "shirt" would overwrite the correct results. Anything that no
        // longer matches what is in the box is stale, so drop it.
        if (query.trim() !== state.searchQuery.trim()) {
          return;
        }

        state.loading = false;
        state.hasSearched = true;
        if (page === 1) {
          state.results = results;
        } else {
          const existingIds = new Set(state.results.map((p) => p.productId));
          const newResults = results.filter((p: Product) => !existingIds.has(p.productId));
          state.results = [...state.results, ...newResults];
        }
        state.page = page;
        state.totalPages = totalPages;
        state.hasMore = page < totalPages;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchSuggestions
      .addCase(fetchSuggestions.pending, (state) => {
        state.suggestionsLoading = true;
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestionsLoading = false;
        state.suggestions = action.payload;
      })
      .addCase(fetchSuggestions.rejected, (state) => {
        state.suggestionsLoading = false;
      })
      // popularSearches
      .addCase(fetchPopularSearches.fulfilled, (state, action) => {
        state.popularSearches = action.payload;
      });
  },
});

export const {
  setSearchQuery,
  clearResults,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  resetSearch,
} = productSearchSlice.actions;

// ── Selectors ───────────────────────────────

export const selectProductSearch = (state: { productSearch: ProductSearchState }) => state.productSearch;
export const selectSearchQuery = (state: { productSearch: ProductSearchState }) => state.productSearch.searchQuery;
export const selectSearchResults = (state: { productSearch: ProductSearchState }) => state.productSearch.results;
export const selectRecentSearches = (state: { productSearch: ProductSearchState }) => state.productSearch.recentSearches;
export const selectSuggestions = (state: { productSearch: ProductSearchState }) => state.productSearch.suggestions;
export const selectSearchLoading = (state: { productSearch: ProductSearchState }) => state.productSearch.loading;
export const selectPopularSearches = (state: { productSearch: ProductSearchState }) => state.productSearch.popularSearches;

export { POPULAR_SEARCHES };

export default productSearchSlice.reducer;
