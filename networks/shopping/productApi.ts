// ============================================
// Shopping Module - Product API (real backend)
// ============================================

import type {
  Product,
  ProductReview,
  PaginatedResponse,
  ProductQueryInterpretation,
  SingleResponse,
} from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError, toShoppingError } from "./shoppingAxios";

// ── Fetch Products ──────────────────────────

export interface FetchProductsParams {
  brandId?: string;
  categoryId?: string;
  gender?: string;
  /** Substring match on name/description/tags (quick; used for suggestions). */
  search?: string;
  /**
   * Natural-language search: understood into filters + a ranked text search
   * ("red shoes under 3k"). The response carries `interpretedAs`.
   */
  q?: string;
  /** Comma-separated chips to drop from the interpretation of `q`. */
  ignore?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  /** Minimum average rating (1–5). */
  minRating?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  page?: number;
  limit?: number;
}

export const fetchProductsApi = async (
  params: FetchProductsParams = {}
): Promise<PaginatedResponse<Product>> => {
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

export type ProductSearchResponse = PaginatedResponse<Product> & {
  interpretedAs?: ProductQueryInterpretation;
};

/** Natural-language product search (`q`), with removed chips as `ignore`. */
export const searchProductsApi = async (
  query: string,
  {
    brandId,
    page = 1,
    limit = 20,
    ignore = [],
  }: { brandId?: string; page?: number; limit?: number; ignore?: string[] } = {}
): Promise<ProductSearchResponse> => {
  return fetchProductsApi({
    q: query,
    brandId,
    page,
    limit,
    ...(ignore.length ? { ignore: ignore.join(",") } : {}),
  }) as Promise<ProductSearchResponse>;
};

/** Name suggestions while typing — plain substring match, no interpretation. */
export const suggestProductsApi = async (
  query: string,
  { brandId, limit = 5 }: { brandId?: string; limit?: number } = {}
): Promise<PaginatedResponse<Product>> => {
  return fetchProductsApi({ search: query, brandId, page: 1, limit });
};

// ── Brand Owner: Create Product ─────────────

export const createProductApi = async (
  payload: Omit<Product, "productId" | "rating" | "totalReviews" | "createdAt">
): Promise<SingleResponse<Product>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/vendor/products", payload);
    return res.data;
  } catch (e) {
    throw toShoppingError(e, "Failed to create product");
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
    throw toShoppingError(e, "Failed to update product");
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
