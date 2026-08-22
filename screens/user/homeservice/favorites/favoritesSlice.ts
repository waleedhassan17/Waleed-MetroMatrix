// ============================================================================
// Favourite providers.
//
// The heart on a provider profile must feel instant, so the icon flips before
// the request resolves. That optimism is only safe because every endpoint
// returns the authoritative full list: on success we replace state with the
// server's answer, and on failure we roll the id back out of the pending set.
// ============================================================================

import { createAppSlice } from '../../../../store/createAppSlice';
import type { RootState } from '../../../../store/store';
import {
  fetchFavorites as fetchFavoritesApi,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  type FavoriteProvider,
} from '../../../../networks/serviceProviders/favoritesNetwork';

interface FavoritesState {
  items: FavoriteProvider[];
  /** Provider ids the user has optimistically favourited, awaiting the server. */
  pendingIds: string[];
  loading: boolean;
  error: string | null;
  /** Distinguishes "no favourites" from "never fetched". */
  loaded: boolean;
}

const initialState: FavoritesState = {
  items: [],
  pendingIds: [],
  loading: false,
  error: null,
  loaded: false,
};

const favoritesSlice = createAppSlice({
  name: 'favorites',
  initialState,
  reducers: (create) => ({
    fetchFavorites: create.asyncThunk(
      async (_: void, { rejectWithValue }) => {
        const response = await fetchFavoritesApi();
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to load favorites.');
        }
        return response.data;
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.loaded = true;
          state.items = action.payload;
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      }
    ),

    addFavorite: create.asyncThunk(
      async (providerId: string, { rejectWithValue }) => {
        const response = await addFavoriteApi(providerId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to save provider.');
        }
        return response.data;
      },
      {
        pending: (state, action) => {
          state.error = null;
          // Optimistic: the heart fills immediately.
          if (!state.pendingIds.includes(action.meta.arg)) {
            state.pendingIds.push(action.meta.arg);
          }
        },
        fulfilled: (state, action) => {
          state.items = action.payload;
          state.loaded = true;
          state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
        },
        rejected: (state, action) => {
          // Roll back — the heart returns to outline.
          state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
          state.error = action.payload as string;
        },
      }
    ),

    removeFavorite: create.asyncThunk(
      async (providerId: string, { rejectWithValue }) => {
        const response = await removeFavoriteApi(providerId);
        if (!response.success || !response.data) {
          return rejectWithValue(response.message || 'Failed to remove provider.');
        }
        return response.data;
      },
      {
        pending: (state, action) => {
          state.error = null;
          // Optimistic removal, mirrored by isFavorite's pendingRemoval check.
          state.items = state.items.filter((p) => p.id !== action.meta.arg);
          state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
        },
        fulfilled: (state, action) => {
          state.items = action.payload;
          state.loaded = true;
        },
        rejected: (state, action) => {
          state.error = action.payload as string;
        },
      }
    ),

    clearFavoritesError: create.reducer((state) => {
      state.error = null;
    }),
  }),
  selectors: {
    selectFavorites: (state) => state.items,
    selectFavoritesLoading: (state) => state.loading,
    selectFavoritesError: (state) => state.error,
    selectFavoritesLoaded: (state) => state.loaded,
    selectPendingFavoriteIds: (state) => state.pendingIds,
  },
});

export const { fetchFavorites, addFavorite, removeFavorite, clearFavoritesError } =
  favoritesSlice.actions;

export const {
  selectFavorites,
  selectFavoritesLoading,
  selectFavoritesError,
  selectFavoritesLoaded,
  selectPendingFavoriteIds,
} = favoritesSlice.selectors;

/**
 * Is this provider saved right now — including one whose add is still in
 * flight, so the heart does not flicker back to outline mid-request.
 */
export const selectIsFavorite = (providerId?: string) => (state: RootState) => {
  if (!providerId) return false;
  const { items, pendingIds } = state.favorites;
  return items.some((p) => p.id === providerId) || pendingIds.includes(providerId);
};

export default favoritesSlice.reducer;
