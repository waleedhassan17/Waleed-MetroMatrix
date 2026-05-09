// ============================================
// Shopping Module - Brand API
// Uses dummy data until backend is ready.
// ============================================

import type {
  BrandConfig,
  Category,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import {
  OUTFITTERS_BRAND,
  OUTFITTERS_CATEGORIES,
  simulateDelay,
  paginateArray,
  singleResponse,
} from "./dummyData";

// All available brands (add more here when expanding)
const ALL_BRANDS: BrandConfig[] = [OUTFITTERS_BRAND];

// ── Fetch All Active Brands ─────────────────

export const fetchBrandsApi = async ({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<
  PaginatedResponse<BrandConfig>
> => {
  await simulateDelay(400);
  console.log("✅ [Dummy] Brands fetched (page:", page, ")");
  return paginateArray(ALL_BRANDS.filter((b) => b.isActive), page, limit);
};

// ── Fetch Single Brand by ID ────────────────

export const fetchBrandByIdApi = async (
  brandId: string
): Promise<SingleResponse<BrandConfig>> => {
  await simulateDelay(250);
  const brand = ALL_BRANDS.find((b) => b.brandId === brandId);
  if (!brand) {
    throw new Error("Brand not found");
  }
  console.log("✅ [Dummy] Brand fetched:", brand.name);
  return singleResponse(brand);
};

// ── Fetch Brand by Slug ─────────────────────

export const fetchBrandBySlugApi = async (
  slug: string
): Promise<SingleResponse<BrandConfig>> => {
  await simulateDelay(250);
  const brand = ALL_BRANDS.find((b) => b.slug === slug);
  if (!brand) {
    throw new Error("Brand not found");
  }
  console.log("✅ [Dummy] Brand fetched by slug:", brand.name);
  return singleResponse(brand);
};

// ── Fetch Categories for a Brand ────────────

export const fetchBrandCategoriesApi = async (
  brandId: string
): Promise<{ success: boolean; data: Category[] }> => {
  await simulateDelay(200);
  // For now all categories belong to Outfitters
  console.log("✅ [Dummy] Categories fetched for brand:", brandId);
  return { success: true, data: OUTFITTERS_CATEGORIES };
};

// ── Admin: Create Brand ─────────────────────

export const createBrandApi = async (
  payload: Omit<BrandConfig, "brandId" | "createdAt">
): Promise<SingleResponse<BrandConfig>> => {
  await simulateDelay(500);
  const newBrand: BrandConfig = {
    ...payload,
    brandId: `brand_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  ALL_BRANDS.push(newBrand);
  console.log("✅ [Dummy] Brand created:", newBrand.name);
  return singleResponse(newBrand);
};

// ── Admin: Update Brand ─────────────────────

export const updateBrandApi = async (
  brandId: string,
  payload: Partial<BrandConfig>
): Promise<SingleResponse<BrandConfig>> => {
  await simulateDelay(400);
  const idx = ALL_BRANDS.findIndex((b) => b.brandId === brandId);
  if (idx === -1) {
    throw new Error("Brand not found");
  }
  ALL_BRANDS[idx] = { ...ALL_BRANDS[idx], ...payload };
  console.log("✅ [Dummy] Brand updated:", brandId);
  return singleResponse(ALL_BRANDS[idx]);
};

// ── Admin: Delete Brand ─────────────────────

export const deleteBrandApi = async (
  brandId: string
): Promise<{ success: boolean }> => {
  await simulateDelay(300);
  const idx = ALL_BRANDS.findIndex((b) => b.brandId === brandId);
  if (idx !== -1) {
    ALL_BRANDS.splice(idx, 1);
  }
  console.log("✅ [Dummy] Brand deleted:", brandId);
  return { success: true };
};
