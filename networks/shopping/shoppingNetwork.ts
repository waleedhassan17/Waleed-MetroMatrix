import type {
  BrandConfig,
  Product,
  Order,
  CartItem,
  WishlistItem,
  ProductReview,
  Category,
  ProductFilters,
} from '../../models/shopping/types';
import { USE_SHOPPING_DUMMY_DATA, shoppingApiRequest } from './config';

// ── Brand APIs ──────────────────────────────

export async function fetchBrandConfig(brandId: string): Promise<BrandConfig | null> {
  if (USE_SHOPPING_DUMMY_DATA) return null; // TODO: add dummy data
  const res = await shoppingApiRequest<BrandConfig>(
    `/brands/${encodeURIComponent(brandId)}`
  );
  return res.success ? res.data : null;
}

export async function fetchBrandCategories(brandId: string): Promise<Category[]> {
  if (USE_SHOPPING_DUMMY_DATA) return [];
  const res = await shoppingApiRequest<Category[]>(
    `/brands/${encodeURIComponent(brandId)}/categories`
  );
  return res.success ? res.data : [];
}

// ── Product APIs ────────────────────────────

export async function fetchProducts(
  brandId: string,
  filters?: ProductFilters,
  page: number = 1,
  limit: number = 20
): Promise<{ products: Product[]; total: number }> {
  if (USE_SHOPPING_DUMMY_DATA) return { products: [], total: 0 };

  const params = new URLSearchParams({
    brandId,
    page: String(page),
    limit: String(limit),
  });
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  if (filters?.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters?.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters?.rating) params.set('rating', String(filters.rating));
  if (filters?.inStockOnly) params.set('inStockOnly', 'true');
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);

  const res = await shoppingApiRequest<{ products: Product[]; total: number }>(
    `/products?${params.toString()}`
  );
  return res.success ? res.data : { products: [], total: 0 };
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  if (USE_SHOPPING_DUMMY_DATA) return null;
  const res = await shoppingApiRequest<Product>(
    `/products/${encodeURIComponent(productId)}`
  );
  return res.success ? res.data : null;
}

export async function searchProducts(
  query: string,
  brandId?: string
): Promise<Product[]> {
  if (USE_SHOPPING_DUMMY_DATA) return [];
  const params = new URLSearchParams({ q: query });
  if (brandId) params.set('brandId', brandId);
  const res = await shoppingApiRequest<Product[]>(
    `/products/search?${params.toString()}`
  );
  return res.success ? res.data : [];
}

// ── Cart APIs ───────────────────────────────

export async function fetchCart(): Promise<CartItem[]> {
  if (USE_SHOPPING_DUMMY_DATA) return [];
  const res = await shoppingApiRequest<CartItem[]>('/cart');
  return res.success ? res.data : [];
}

export async function addToCart(item: {
  productId: string;
  brandId: string;
  variantId?: string;
  quantity: number;
}): Promise<CartItem | null> {
  if (USE_SHOPPING_DUMMY_DATA) return null;
  const res = await shoppingApiRequest<CartItem>('/cart', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return res.success ? res.data : null;
}

export async function removeFromCart(cartItemId: string): Promise<boolean> {
  if (USE_SHOPPING_DUMMY_DATA) return true;
  const res = await shoppingApiRequest<{ success: boolean }>(
    `/cart/${encodeURIComponent(cartItemId)}`,
    { method: 'DELETE' }
  );
  return res.success;
}

// ── Order APIs ──────────────────────────────

export async function fetchOrders(page: number = 1): Promise<{ orders: Order[]; total: number }> {
  if (USE_SHOPPING_DUMMY_DATA) return { orders: [], total: 0 };
  const res = await shoppingApiRequest<{ orders: Order[]; total: number }>(
    `/orders?page=${page}`
  );
  return res.success ? res.data : { orders: [], total: 0 };
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  if (USE_SHOPPING_DUMMY_DATA) return null;
  const res = await shoppingApiRequest<Order>(
    `/orders/${encodeURIComponent(orderId)}`
  );
  return res.success ? res.data : null;
}

export async function placeOrder(data: {
  brandId: string;
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  shippingAddressId: string;
  paymentMethod: string;
  couponCode?: string;
  notes?: string;
}): Promise<Order | null> {
  if (USE_SHOPPING_DUMMY_DATA) return null;
  const res = await shoppingApiRequest<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.success ? res.data : null;
}

// ── Wishlist APIs ───────────────────────────

export async function fetchWishlist(): Promise<WishlistItem[]> {
  if (USE_SHOPPING_DUMMY_DATA) return [];
  const res = await shoppingApiRequest<WishlistItem[]>('/wishlist');
  return res.success ? res.data : [];
}

export async function toggleWishlist(productId: string, brandId: string): Promise<boolean> {
  if (USE_SHOPPING_DUMMY_DATA) return true;
  const res = await shoppingApiRequest<{ success: boolean }>('/wishlist/toggle', {
    method: 'POST',
    body: JSON.stringify({ productId, brandId }),
  });
  return res.success;
}

// ── Review APIs ─────────────────────────────

export async function fetchProductReviews(
  productId: string,
  page: number = 1
): Promise<{ reviews: ProductReview[]; total: number }> {
  if (USE_SHOPPING_DUMMY_DATA) return { reviews: [], total: 0 };
  const res = await shoppingApiRequest<{ reviews: ProductReview[]; total: number }>(
    `/products/${encodeURIComponent(productId)}/reviews?page=${page}`
  );
  return res.success ? res.data : { reviews: [], total: 0 };
}
