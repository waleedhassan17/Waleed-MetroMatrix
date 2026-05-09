// ============================================
// Shopping Module - Brand Serializers
// ============================================

import type { BrandConfig, Category } from '../../types/shopping';
import {
  BrandConfigSchema,
  BrandConfigListSchema,
  CategorySchema,
  CategoryListSchema,
} from '../../models/shopping/brandModel';

// ── Safe Serializers (with Zod validation) ──

export function serializeBrand(data: unknown): BrandConfig {
  return BrandConfigSchema.parse(data);
}

export function serializeBrandList(data: unknown): BrandConfig[] {
  return BrandConfigListSchema.parse(data);
}

export function serializeCategory(data: unknown): Category {
  return CategorySchema.parse(data);
}

export function serializeCategoryList(data: unknown): Category[] {
  return CategoryListSchema.parse(data);
}

// ── Safe Serializers (non-throwing) ─────────

export function safeBrandSerialize(data: unknown) {
  return BrandConfigSchema.safeParse(data);
}

export function safeBrandListSerialize(data: unknown) {
  return BrandConfigListSchema.safeParse(data);
}

export function safeCategorySerialize(data: unknown) {
  return CategorySchema.safeParse(data);
}

export function safeCategoryListSerialize(data: unknown) {
  return CategoryListSchema.safeParse(data);
}
