import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchWishlistApi,
  addToWishlistApi,
  removeFromWishlistApi,
  type WishlistItemView,
} from '../../../../networks/shopping/wishlistApi';

export interface WishlistItemState {
  productId: string;
  productName: string;
  productImage: string;
  brandId: string;
  brandName: string;
  price: number;
  originalPrice?: number;
}

export interface WishlistState {
  items: WishlistItemState[];
  loading: boolean;
  error: string | null;
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
};

const mapServerItems = (items: (WishlistItemView & { brandName?: string })[]): WishlistItemState[] =>
  items.map((it) => ({
    productId: it.productId,
    productName: it.product?.name || '',
    productImage: it.product?.images?.[0] || '',
    brandId: it.brandId,
    brandName: it.brandName || '',
    price: it.product?.salePrice ?? it.product?.basePrice ?? 0,
    originalPrice: it.product?.salePrice != null ? it.product?.basePrice : undefined,
  }));

// ── Server-backed thunks (same names as the old local actions) ──────

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await fetchWishlistApi();
    return mapServerItems(res.data);
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load wishlist');
  }
});

export const addToWishlist = createAsyncThunk(
  'wishlist/add',
  async (item: WishlistItemState, { rejectWithValue }) => {
    try {
      const res = await addToWishlistApi(item.productId);
      return mapServerItems(res.data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add to wishlist');
    }
  }
);

export const removeWishlistItem = createAsyncThunk(
  'wishlist/remove',
  async (productId: string, { rejectWithValue }) => {
    try {
      const res = await removeFromWishlistApi(productId);
      return mapServerItems(res.data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove from wishlist');
    }
  }
);

export const toggleWishlistItem = createAsyncThunk(
  'wishlist/toggle',
  async (item: WishlistItemState, { getState, rejectWithValue }) => {
    try {
      const { wishlist } = getState() as { wishlist: WishlistState };
      const exists = wishlist.items.some((i) => i.productId === item.productId);
      const res = exists
        ? await removeFromWishlistApi(item.productId)
        : await addToWishlistApi(item.productId);
      return mapServerItems(res.data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update wishlist');
    }
  }
);

const serverThunks = [fetchWishlist, addToWishlist, removeWishlistItem, toggleWishlistItem] as const;

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlist(state) {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    serverThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          state.items = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        });
    });
  },
});

export const { clearWishlist } = wishlistSlice.actions;
export const selectWishlist = (state: { wishlist: WishlistState }) => state.wishlist;
export const selectWishlistItems = (state: { wishlist: WishlistState }) => state.wishlist.items;
export const selectWishlistCount = (state: { wishlist: WishlistState }) => state.wishlist.items.length;
export const selectIsInWishlist = (productId: string) => (state: { wishlist: WishlistState }) =>
  state.wishlist.items.some((i) => i.productId === productId);
export default wishlistSlice.reducer;
