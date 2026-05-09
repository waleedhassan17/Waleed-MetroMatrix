import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: WishlistState = {
  items: [
    { productId: 'P-1001', productName: 'Classic Cotton Shirt', productImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300', brandId: 'B-1', brandName: 'Outfitters', price: 2999 },
    { productId: 'P-1003', productName: 'Running Shoe', productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', brandId: 'B-1', brandName: 'Outfitters', price: 5999, originalPrice: 7499 },
  ],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist(state, action: PayloadAction<WishlistItemState>) {
      const exists = state.items.some((i) => i.productId === action.payload.productId);
      if (!exists) {
        state.items.unshift(action.payload);
      }
    },
    removeWishlistItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    toggleWishlistItem(state, action: PayloadAction<WishlistItemState>) {
      const idx = state.items.findIndex((i) => i.productId === action.payload.productId);
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.unshift(action.payload);
      }
    },
    clearWishlist(state) {
      state.items = [];
    },
  },
});

export const { addToWishlist, removeWishlistItem, toggleWishlistItem, clearWishlist } = wishlistSlice.actions;
export const selectWishlist = (state: { wishlist: WishlistState }) => state.wishlist;
export const selectWishlistItems = (state: { wishlist: WishlistState }) => state.wishlist.items;
export const selectWishlistCount = (state: { wishlist: WishlistState }) => state.wishlist.items.length;
export const selectIsInWishlist = (productId: string) => (state: { wishlist: WishlistState }) =>
  state.wishlist.items.some((i) => i.productId === productId);
export default wishlistSlice.reducer;