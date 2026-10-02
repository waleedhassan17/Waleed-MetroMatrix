// ============================================================================
// Recommendations and "describe the problem" search (backend: src/modules/ml).
//
// Every item the server returns has already been re-checked against what a
// customer may see today, and carries a short human `reason` ("Because you
// liked …", "Bought together", "You rated them 5★ — book again"). All calls
// are bestEffort: a recommendation rail is decoration, so a failure hides the
// rail instead of raising an error over a working screen.
// ============================================================================

import { apiRequest } from '../serviceProviders/config';
import type { ApiResponse } from '../../models/serviceProviders';
import type { Product } from '../../types/shopping';

export interface ProductPick {
  product: Product;
  reason: string;
  score?: number;
}

export interface ProductShelf {
  /** 'personal' = from this shopper's history; 'popular' = what sells now. */
  source?: 'personal' | 'popular';
  items: ProductPick[];
}

/** Raw provider card, as GET /providers returns it (serialise before use). */
export interface ProviderPick {
  provider: any;
  reason: string;
}

export interface DoctorPick {
  doctor: any;
  reason: string;
}

export interface ServiceSearchResult {
  query: string;
  interpreted: {
    category: 'electricians' | 'plumbers' | 'ac-repairers' | null;
    label: string | null;
    availableNow: boolean;
    candidates: { category: 'electricians' | 'plumbers' | 'ac-repairers'; label: string }[];
    source: 'rules' | 'llm';
  };
  providers: any[];
  noneAvailableNow: boolean;
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

type Point = { lat: number; lng: number } | null | undefined;
const at = (p: Point) => (p ? { lat: p.lat, lng: p.lng } : {});

/** "Recommended for you" — personal when signed in, otherwise popular. */
export function fetchRecommendedProducts(brandId?: string | null): Promise<ApiResponse<ProductShelf>> {
  return apiRequest(`/recommendations/shopping${qs({ brandId })}`, { bestEffort: true });
}

/** Best sellers right now (the real "Trending"). */
export function fetchTrendingProducts(brandId?: string | null): Promise<ApiResponse<ProductShelf>> {
  return apiRequest(`/recommendations/shopping/trending${qs({ brandId })}`, { bestEffort: true });
}

/** Similar items and things bought together with this product. */
export function fetchSimilarProducts(productId: string, brandId?: string | null): Promise<ApiResponse<ProductShelf>> {
  return apiRequest(`/recommendations/shopping/similar/${encodeURIComponent(productId)}${qs({ brandId })}`, { bestEffort: true });
}

/** Home Services: "book again" + the trades this customer books, near them. */
export function fetchRecommendedProviders(origin?: Point): Promise<ApiResponse<{ source: string; items: ProviderPick[] }>> {
  return apiRequest(`/recommendations/homeservice${qs(at(origin))}`, { bestEffort: true });
}

/** Healthcare: doctors for this patient, with distance when a point is given. */
export function fetchRecommendedDoctors(origin?: Point): Promise<ApiResponse<{ source: string; items: DoctorPick[] }>> {
  return apiRequest(`/recommendations/healthcare${qs(at(origin))}`, { bestEffort: true });
}

/** "My AC is not cooling" → which trade, plus the top three providers for it. */
export function searchServices(q: string, origin?: Point): Promise<ApiResponse<ServiceSearchResult>> {
  return apiRequest(`/search/services${qs({ q, ...at(origin) })}`);
}
