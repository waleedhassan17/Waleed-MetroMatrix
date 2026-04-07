// ============================================
// Brand List — Serializer
// ============================================

import type { BrandListParams } from './brandListApi';

export function serializeBrandListRequest(params: {
  search?: string;
  category?: string;
  sort?: string;
}): BrandListParams {
  const out: BrandListParams = {};
  if (params.search?.trim()) out.search = params.search.trim();
  if (params.category && params.category !== 'All') out.category = params.category;
  if (params.sort) out.sortBy = params.sort as BrandListParams['sortBy'];
  return out;
}
