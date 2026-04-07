// ============================================
// Brand Store — Model (mapper)
// ============================================

import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';
import type { BrandStoreData } from './brandStoreApi';

export interface MappedBrandStore {
  brand: BrandConfig;
  categories: Category[];
  featuredProducts: Product[];
}

export function mapBrandStore(raw: BrandStoreData): MappedBrandStore {
  return {
    brand: raw.brand,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    featuredProducts: Array.isArray(raw.featuredProducts) ? raw.featuredProducts : [],
  };
}
