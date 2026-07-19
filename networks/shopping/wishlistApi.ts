// ============================================
// Shopping Module - Wishlist API (real backend)
// ============================================

import type { Product, WishlistItem } from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

/** Wishlist items come back with the populated product card. */
export interface WishlistItemView extends WishlistItem {
  product: Product;
}

// GET /wishlist
export const fetchWishlistApi = async (): Promise<{
  success: boolean;
  data: WishlistItemView[];
}> => {
  try {
    const res = await ShoppingAxiosInstance.get("/wishlist");
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load wishlist"));
  }
};

// POST /wishlist/:productId
export const addToWishlistApi = async (
  productId: string
): Promise<{ success: boolean; data: WishlistItemView[] }> => {
  try {
    const res = await ShoppingAxiosInstance.post(`/wishlist/${productId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to add to wishlist"));
  }
};

// DELETE /wishlist/:productId
export const removeFromWishlistApi = async (
  productId: string
): Promise<{ success: boolean; data: WishlistItemView[] }> => {
  try {
    const res = await ShoppingAxiosInstance.delete(`/wishlist/${productId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to remove from wishlist"));
  }
};
