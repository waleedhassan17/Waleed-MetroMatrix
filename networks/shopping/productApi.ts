// ============================================
// Shopping Module - Product API
// Uses dummy data until backend is ready.
// ============================================

import type {
  Product,
  ProductReview,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import {
  OUTFITTERS_PRODUCTS,
  PRODUCT_REVIEWS,
  simulateDelay,
  paginateArray,
  singleResponse,
} from "./dummyData";

// Mutable products array (for CRUD operations)
let ALL_PRODUCTS: Product[] = [...OUTFITTERS_PRODUCTS];

// ── Fetch Products ──────────────────────────

export interface FetchProductsParams {
  brandId?: string;
  categoryId?: string;
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
  await simulateDelay(350);
  const { page = 1, limit = 20, brandId, categoryId, search, sortBy, minPrice, maxPrice, inStock, isFeatured, isNewArrival } = params;

  let filtered = [...ALL_PRODUCTS];

  if (brandId) filtered = filtered.filter((p) => p.brandId === brandId);
  if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId);
  if (isFeatured) filtered = filtered.filter((p) => p.isFeatured);
  if (isNewArrival) filtered = filtered.filter((p) => p.isNewArrival);
  if (inStock) filtered = filtered.filter((p) => p.inStock);
  if (minPrice !== undefined) filtered = filtered.filter((p) => (p.salePrice || p.basePrice) >= minPrice);
  if (maxPrice !== undefined) filtered = filtered.filter((p) => (p.salePrice || p.basePrice) <= maxPrice);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
    );
  }

  // Sort
  switch (sortBy) {
    case 'price_asc':
      filtered.sort((a, b) => (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice));
      break;
    case 'price_desc':
      filtered.sort((a, b) => (b.salePrice || b.basePrice) - (a.salePrice || a.basePrice));
      break;
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'popular':
    default:
      filtered.sort((a, b) => b.totalReviews - a.totalReviews);
      break;
  }

  console.log("✅ [Dummy] Products fetched:", filtered.length, "total, page:", page);
  return paginateArray(filtered, page, limit);
};

// ── Fetch Single Product ────────────────────

export const fetchProductByIdApi = async (
  productId: string
): Promise<SingleResponse<Product>> => {
  await simulateDelay(200);
  const product = ALL_PRODUCTS.find((p) => p.productId === productId);
  if (!product) {
    throw new Error("Product not found");
  }
  console.log("✅ [Dummy] Product fetched:", product.name);
  return singleResponse(product);
};

// ── Fetch Product Reviews ───────────────────

export const fetchProductReviewsApi = async (
  productId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<ProductReview>> => {
  await simulateDelay(200);
  const reviews = PRODUCT_REVIEWS.filter((r) => r.productId === productId);
  console.log("✅ [Dummy] Reviews fetched for:", productId, "count:", reviews.length);
  return paginateArray(reviews, page, limit);
};

// ── Submit Product Review ───────────────────

export const submitProductReviewApi = async (
  productId: string,
  payload: { rating: number; title?: string; comment: string; images?: string[] }
): Promise<SingleResponse<ProductReview>> => {
  await simulateDelay(400);
  const newReview: ProductReview = {
    reviewId: `rev_${Date.now()}`,
    productId,
    userId: 'current_user',
    userName: 'You',
    rating: payload.rating,
    title: payload.title,
    comment: payload.comment,
    images: payload.images,
    isVerifiedPurchase: true,
    createdAt: new Date().toISOString(),
  };
  PRODUCT_REVIEWS.push(newReview);
  console.log("✅ [Dummy] Review submitted for:", productId);
  return singleResponse(newReview);
};

// ── Search Products ─────────────────────────

export const searchProductsApi = async (
  query: string,
  { brandId, page = 1, limit = 20 }: { brandId?: string; page?: number; limit?: number } = {}
): Promise<PaginatedResponse<Product>> => {
  await simulateDelay(300);
  return fetchProductsApi({ search: query, brandId, page, limit });
};

// ── Brand Owner: Create Product ─────────────

export const createProductApi = async (
  payload: Omit<Product, "productId" | "rating" | "totalReviews" | "createdAt">
): Promise<SingleResponse<Product>> => {
  await simulateDelay(500);
  const newProduct: Product = {
    ...payload,
    productId: `prod_${Date.now()}`,
    rating: 0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
  };
  ALL_PRODUCTS.push(newProduct);
  console.log("✅ [Dummy] Product created:", newProduct.name);
  return singleResponse(newProduct);
};

// ── Brand Owner: Update Product ─────────────

export const updateProductApi = async (
  productId: string,
  payload: Partial<Product>
): Promise<SingleResponse<Product>> => {
  await simulateDelay(400);
  const idx = ALL_PRODUCTS.findIndex((p) => p.productId === productId);
  if (idx === -1) {
    throw new Error("Product not found");
  }
  ALL_PRODUCTS[idx] = { ...ALL_PRODUCTS[idx], ...payload };
  console.log("✅ [Dummy] Product updated:", productId);
  return singleResponse(ALL_PRODUCTS[idx]);
};

// ── Brand Owner: Delete Product ─────────────

export const deleteProductApi = async (
  productId: string
): Promise<{ success: boolean }> => {
  await simulateDelay(300);
  ALL_PRODUCTS = ALL_PRODUCTS.filter((p) => p.productId !== productId);
  console.log("✅ [Dummy] Product deleted:", productId);
  return { success: true };
};
