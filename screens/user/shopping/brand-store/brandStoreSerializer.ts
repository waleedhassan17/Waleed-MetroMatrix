// ============================================
// Brand Store — Serializer
// ============================================

import type { BrandProductsParams } from './brandStoreApi';

export function serializeBrandStoreRequest(params: {
  brandId: string;
  category?: string;
  sort?: string;
  page?: number;
}): BrandProductsParams {
  const out: BrandProductsParams = { brandId: params.brandId };
  if (params.category) out.categoryId = params.category;
  if (params.sort) out.sortBy = params.sort as BrandProductsParams['sortBy'];
  if (params.page) out.page = params.page;
  return out;
}
