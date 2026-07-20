// ============================================
// Shopping Module - Product API (real backend)
// ============================================

import type {
  Product,
  ProductReview,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";
import { USE_SHOPPING_DUMMY_DATA } from "../../config/env";
import {
  OUTFITTERS_PRODUCTS,
  PRODUCT_REVIEWS,
  simulateDelay,
  paginateArray,
  singleResponse,
} from "./dummyData";

// ── Fetch Products ──────────────────────────

export interface FetchProductsParams {
  brandId?: string;
  categoryId?: string;
  gender?: string;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  page?: number;
  limit?: number;
}

export const fetchProductsApi = async (
  params: FetchProductsParams = {}
): Promise<PaginatedResponse<Product>> => {
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(350);
    const { page = 1, limit = 20 } = params;
    return paginateArray(OUTFITTERS_PRODUCTS, page, limit);
  }
  try {
    const res = await ShoppingAxiosInstance.get("/products", { params });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load products"));
  }
};

// ── Fetch Single Product ────────────────────

export const fetchProductByIdApi = async (
  productId: string
): Promise<SingleResponse<Product>> => {
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(200);
    const product = OUTFITTERS_PRODUCTS.find((p) => p.productId === productId);
    if (!product) throw new Error("Product not found");
    return singleResponse(product);
  }
  try {
    const res = await ShoppingAxiosInstance.get(`/products/${productId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load product"));
  }
};

// ── Fetch Product Reviews ───────────────────

export const fetchProductReviewsApi = async (
  productId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<ProductReview>> => {
  if (USE_SHOPPING_DUMMY_DATA) {
    await simulateDelay(200);
    return paginateArray(PRODUCT_REVIEWS.filter((r) => r.productId === productId), page, limit);
  }
  try {
    const res = await ShoppingAxiosInstance.get(`/products/${productId}/reviews`, {
      params: { page, limit },
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load reviews"));
  }
};

// ── Submit Product Review ───────────────────

export const submitProductReviewApi = async (
  productId: string,
  payload: { rating: number; title?: string; comment: string; images?: string[] }
): Promise<SingleResponse<ProductReview>> => {
  try {
    const res = await ShoppingAxiosInstance.post(`/products/${productId}/review`, payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to submit review"));
  }
};

// ── Search Products ─────────────────────────

export const searchProductsApi = async (
  query: string,
  { brandId, page = 1, limit = 20 }: { brandId?: string; page?: number; limit?: number } = {}
): Promise<PaginatedResponse<Product>> => {
  return fetchProductsApi({ search: query, brandId, page, limit });
};

// ── Brand Owner: Create Product ─────────────

export const createProductApi = async (
  payload: Omit<Product, "productId" | "rating" | "totalReviews" | "createdAt">
): Promise<SingleResponse<Product>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/vendor/products", payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to create product"));
  }
};

// ── Brand Owner: Update Product ─────────────

export const updateProductApi = async (
  productId: string,
  payload: Partial<Product>
): Promise<SingleResponse<Product>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/vendor/products/${productId}`, payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to update product"));
  }
};

// ── Brand Owner: Delete Product ─────────────

export const deleteProductApi = async (
  productId: string
): Promise<{ success: boolean }> => {
  try {
    const res = await ShoppingAxiosInstance.delete(`/vendor/products/${productId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to delete product"));
  }
};
