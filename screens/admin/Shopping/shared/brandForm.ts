// ============================================================================
// The brand form's draft: from a brand, to what the server takes, and what is
// missing. Pure, so it is tested.
// ============================================================================

import type { BrandPayload, ShopBrand } from '../../../../networks/admin/shoppingApi';
import { DEFAULT_RETURN_DAYS } from '../../../../utils/admin/parse';
import { colorProblem } from './colors';

export interface BrandDraft {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string;
  bannerImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  categories: string[];
  returnDays: string;
  shippingInfo: string;
  paymentMethods: string[];
  contactEmail: string;
  contactPhone: string;
  website: string;
  facebook: string;
  instagram: string;
  twitter: string;
  isActive: boolean;
}

export const EMPTY_BRAND: BrandDraft = {
  name: '',
  slug: '',
  tagline: '',
  description: '',
  logo: '',
  bannerImage: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  categories: [],
  returnDays: String(DEFAULT_RETURN_DAYS),
  shippingInfo: '',
  paymentMethods: [],
  contactEmail: '',
  contactPhone: '',
  website: '',
  facebook: '',
  instagram: '',
  twitter: '',
  isActive: true,
};

export const slugify = (name: string): string =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function draftFromBrand(b: ShopBrand): BrandDraft {
  return {
    name: b.name ?? '',
    slug: b.slug ?? '',
    tagline: b.tagline ?? '',
    description: b.description ?? '',
    logo: b.logo ?? '',
    bannerImage: b.bannerImage ?? '',
    primaryColor: b.primaryColor ?? '',
    secondaryColor: b.secondaryColor ?? '',
    accentColor: b.accentColor ?? '',
    categories: [...(b.categories ?? [])],
    returnDays: String(b.policies?.returnDays ?? DEFAULT_RETURN_DAYS),
    shippingInfo: b.policies?.shippingInfo ?? '',
    paymentMethods: [...(b.policies?.paymentMethods ?? [])],
    contactEmail: b.contactEmail ?? '',
    contactPhone: b.contactPhone ?? '',
    website: b.website ?? '',
    facebook: b.socialLinks?.facebook ?? '',
    instagram: b.socialLinks?.instagram ?? '',
    twitter: b.socialLinks?.twitter ?? '',
    isActive: b.status === 'active',
  };
}

/** Field → problem. Empty when the draft can be saved. */
export function brandProblems(d: BrandDraft): Record<string, string> {
  const problems: Record<string, string> = {};
  if (!d.name.trim()) problems.name = 'A brand needs a name.';
  if (!d.description.trim()) problems.description = 'Say what the brand sells.';
  if (!d.contactEmail.trim()) problems.contactEmail = 'Customers and the console need a contact email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contactEmail.trim())) problems.contactEmail = 'That is not an email address.';
  const days = Number(d.returnDays);
  if (d.returnDays.trim() === '' || !Number.isInteger(days) || days < 0 || days > 365) problems.returnDays = 'Enter whole days from 0 to 365.';
  for (const key of ['primaryColor', 'secondaryColor', 'accentColor'] as const) {
    const problem = colorProblem(d[key]);
    if (problem) problems[key] = problem;
  }
  return problems;
}

/**
 * What to send. A colour left empty is left out on create, so the server's
 * default applies (an empty string would be stored as "no colour").
 */
export function brandPayload(d: BrandDraft, mode: 'create' | 'edit'): BrandPayload {
  const color = (v: string) => (v.trim() ? v.trim() : mode === 'create' ? undefined : '');
  return {
    name: d.name.trim(),
    slug: d.slug.trim() || undefined,
    tagline: d.tagline.trim(),
    description: d.description.trim(),
    logo: d.logo.trim(),
    bannerImage: d.bannerImage.trim(),
    primaryColor: color(d.primaryColor),
    secondaryColor: color(d.secondaryColor),
    accentColor: color(d.accentColor),
    categories: d.categories,
    policies: { returnDays: Number(d.returnDays), shippingInfo: d.shippingInfo.trim(), paymentMethods: d.paymentMethods },
    contactEmail: d.contactEmail.trim(),
    contactPhone: d.contactPhone.trim(),
    website: d.website.trim(),
    socialLinks: { facebook: d.facebook.trim(), instagram: d.instagram.trim(), twitter: d.twitter.trim() },
    ...(mode === 'create' ? { isActive: d.isActive } : {}),
  };
}
