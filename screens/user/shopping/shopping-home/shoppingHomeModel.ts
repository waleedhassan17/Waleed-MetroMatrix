// ============================================
// Shopping Home — Model (mapper)
// ============================================

import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';
import type { HomeBanner, HomeFeedData } from './shoppingHomeApi';

export interface MappedHomeFeed {
  brands: BrandConfig[];
  products: Product[];
  banners: HomeBanner[];
  categories: Category[];
}

/**
 * Normalise raw API payload into the shape the slice expects.
 * Handles missing / malformed fields gracefully.
 */
export function mapHomeFeed(raw: HomeFeedData): MappedHomeFeed {
  return {
    brands: Array.isArray(raw.featuredBrands) ? raw.featuredBrands : [],
    products: Array.isArray(raw.featuredProducts) ? raw.featuredProducts : [],
    banners: Array.isArray(raw.banners) ? raw.banners : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
  };
}
