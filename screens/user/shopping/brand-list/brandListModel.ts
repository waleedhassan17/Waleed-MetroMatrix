// ============================================
// Brand List — Model (mapper)
// ============================================

import type { BrandListItem, BrandListResponse } from './brandListApi';

export function mapBrandList(raw: BrandListResponse): BrandListItem[] {
  if (!raw || !Array.isArray(raw.brands)) return [];
  return raw.brands;
}
