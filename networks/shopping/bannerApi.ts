// ============================================
// Shopping Module - Promo Banner API (real backend)
//
// The storefront carousel used to be a hardcoded fixture in dummyData.ts, so
// marketing copy could only change with an app release and the banners pointed
// at a brand id that did not exist. Banners are rows now: public read for the
// storefront, admin CRUD for managing them.
// ============================================

import type { PaginatedResponse, SingleResponse } from "../../types/shopping";
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

export type BannerPayload = Partial<
  Pick<
    BannerView,
    | "title"
    | "subtitle"
    | "image"
    | "brandId"
    | "productId"
    | "sortOrder"
    | "isActive"
    | "validFrom"
    | "validUntil"
  >
>;

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

// ── Admin: manage banners ───────────────────

export const fetchAdminBannersApi = (
  params: { page?: number; limit?: number; isActive?: boolean } = {}
) =>
  call<PaginatedResponse<BannerView>>(
    () => ShoppingAxiosInstance.get("/admin/banners", { params }),
    "Failed to load banners"
  );

export const createBannerApi = (payload: BannerPayload) =>
  call<SingleResponse<BannerView>>(
    () => ShoppingAxiosInstance.post("/admin/banners", payload),
    "Failed to create banner"
  );

export const updateBannerApi = (bannerId: string, payload: BannerPayload) =>
  call<SingleResponse<BannerView>>(
    () => ShoppingAxiosInstance.patch(`/admin/banners/${bannerId}`, payload),
    "Failed to update banner"
  );

export const deleteBannerApi = (bannerId: string) =>
  call<{ success: boolean }>(
    () => ShoppingAxiosInstance.delete(`/admin/banners/${bannerId}`),
    "Failed to delete banner"
  );

export const uploadBannerImageApi = (bannerId: string, image: string) =>
  call<SingleResponse<BannerView>>(
    () => ShoppingAxiosInstance.post(`/admin/banners/${bannerId}/image`, { image }),
    "Failed to upload banner image"
  );
