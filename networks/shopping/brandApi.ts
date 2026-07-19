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
import { USE_SHOPPING_DUMMY_DATA } from "../../config/env";
import {
  OUTFITTERS_BRAND,
  OUTFITTERS_CATEGORIES,
  simulateDelay,
  paginateArray,
  singleResponse,
} from "./dummyData";

// ── Fetch All Active Brands ─────────────────

export const fetchBrandsApi = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<
  PaginatedResponse<BrandConfig>
> => {
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(400);
    return paginateArray([OUTFITTERS_BRAND].filter((b) => b.isActive), page, limit);
  }
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
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(250);
    return singleResponse(OUTFITTERS_BRAND);
  }
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
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(250);
    return singleResponse(OUTFITTERS_BRAND);
  }
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
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(200);
    return { success: true, data: OUTFITTERS_CATEGORIES };
  }
  try {
    const res = await ShoppingAxiosInstance.get(`/brands/${brandId}/categories`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load categories"));
  }
};

// ── Admin: Create Brand ─────────────────────

export const createBrandApi = async (
  payload: Omit<BrandConfig, "brandId" | "createdAt">
): Promise<SingleResponse<BrandConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/admin/brands", payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to create brand"));
  }
};

// ── Admin: Update Brand ─────────────────────

export const updateBrandApi = async (
  brandId: string,
  payload: Partial<BrandConfig>
): Promise<SingleResponse<BrandConfig>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/admin/brands/${brandId}`, payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to update brand"));
  }
};

// ── Admin: Delete Brand ─────────────────────

export const deleteBrandApi = async (
  brandId: string
): Promise<{ success: boolean }> => {
  try {
    const res = await ShoppingAxiosInstance.delete(`/admin/brands/${brandId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to delete brand"));
  }
};
