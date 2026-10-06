// ============================================
// Shopping Module - Brand API (real backend)
// ============================================

import type {
  BrandConfig,
  Category,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

// ── Fetch All Active Brands ─────────────────

export const fetchBrandsApi = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<
  PaginatedResponse<BrandConfig>
> => {
  try {
    const res = await ShoppingAxiosInstance.get("/brands", { params: { page, limit } });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load brands"));
  }
};

// ── Fetch Single Brand by ID ────────────────

export const fetchBrandByIdApi = async (
  brandId: string
): Promise<SingleResponse<BrandConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.get(`/brands/${brandId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load brand"));
  }
};

// ── Fetch Brand by Slug ─────────────────────

export const fetchBrandBySlugApi = async (
  slug: string
): Promise<SingleResponse<BrandConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.get(`/brands/slug/${slug}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load brand"));
  }
};

// ── Fetch Categories for a Brand ────────────

export const fetchBrandCategoriesApi = async (
  brandId: string
): Promise<{ success: boolean; data: Category[] }> => {
  try {
    const res = await ShoppingAxiosInstance.get(`/brands/${brandId}/categories`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load categories"));
  }
};

// Creating, editing and deleting brands is the admin console's (networks/admin/shoppingApi.ts).
