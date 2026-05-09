import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../../../types/shopping';
import { searchProductsApi } from '../../../../networks/shopping/productApi';

// ── State Interface ─────────────────────────

export interface ProductSearchState {
  searchQuery: string;
  results: Product[];
  recentSearches: string[];
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
  suggestions: [],
  loading: false,
  suggestionsLoading: false,
  error: null,
  hasSearched: false,
  page: 1,
  totalPages: 1,
  hasMore: false,
};

// ── Popular searches (static for now) ───────

const POPULAR_SEARCHES = [
  'Sneakers', 'T-Shirts', 'Dresses', 'Watches',
  'Headphones', 'Backpacks', 'Sunglasses', 'Perfume',
];

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
  async (query: string, { rejectWithValue }) => {
    try {
      if (!query.trim() || query.length < 2) {
        return [];
      }

      // Use search API with small limit for suggestions
      const res = await searchProductsApi(query, { limit: 5 });
      if (res.success) {
        return res.data.map((p: Product) => p.name).slice(0, 5);
      }
      return [];
    } catch {
      return [];
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
        state.loading = false;
        state.hasSearched = true;
        const { results, page, totalPages } = action.payload;
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
      });
  },
});

export const {
  setSearchQuery,
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

export { POPULAR_SEARCHES };

export default productSearchSlice.reducer;
