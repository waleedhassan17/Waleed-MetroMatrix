// ============================================
// Shopping Module - Promo Banner API (real backend)
//
// The storefront carousel used to be a hardcoded fixture in dummyData.ts, so
// marketing copy could only change with an app release and the banners pointed
// at a brand id that did not exist. Banners are rows now: public read for the
// storefront, admin CRUD for managing them.
// ============================================

import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

export interface BannerView {
  bannerId: string;
  title: string;
  subtitle?: string;
  image: string;
  brandId?: string | null;
  productId?: string | null;
  sortOrder: number;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const call = async <T>(fn: () => Promise<{ data: T }>, fallback: string): Promise<T> => {
  try {
    const res = await fn();
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, fallback));
  }
};

// ── Public: storefront carousel ─────────────
// Returns only banners that are active and inside their date window.

export const fetchBannersApi = () =>
  call<{ success: boolean; data: BannerView[] }>(
    () => ShoppingAxiosInstance.get("/banners"),
    "Failed to load banners"
  );

// Managing banners is the admin console's (networks/admin/shoppingApi.ts).
