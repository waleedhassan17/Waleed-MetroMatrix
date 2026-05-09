// ============================================
// Shopping Module - Brand Zod Validation Schemas
// ============================================

import { z } from 'zod';

// ── Brand Policies Schema ───────────────────

export const BrandPoliciesSchema = z.object({
  returnDays: z.number(),
  shippingInfo: z.string(),
  paymentMethods: z.array(z.string()),
});

// ── Brand Social Links Schema ───────────────

export const BrandSocialLinksSchema = z.object({
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
});

// ── Brand Config Schema ─────────────────────

export const BrandConfigSchema = z.object({
  brandId: z.string(),
  odexId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  tagline: z.string(),
  logo: z.string(),
  bannerImage: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  categories: z.array(z.string()),
  policies: BrandPoliciesSchema,
  contactEmail: z.string(),
  contactPhone: z.string(),
  website: z.string(),
  socialLinks: BrandSocialLinksSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});

// ── Category Schema ─────────────────────────

export const CategorySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    categoryId: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: z.string(),
    parentId: z.string().optional(),
    children: z.array(CategorySchema),
    productCount: z.number(),
  })
);

// ── List Schemas ────────────────────────────

export const BrandConfigListSchema = z.array(BrandConfigSchema);
export const CategoryListSchema = z.array(CategorySchema);
