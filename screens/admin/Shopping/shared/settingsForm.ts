// ============================================================================
// The shopping settings form. Pure, so it is tested.
// ============================================================================

import type { ShopSettings } from '../../../../networks/admin/shoppingApi';

type NumberKey = 'shippingFeePerBrand' | 'freeShippingThreshold' | 'lowStockThreshold' | 'defaultReturnDays';

export interface SettingsForm {
  numbers: Record<NumberKey, string>;
  autoApproveBrands: boolean;
  autoApproveProducts: boolean;
  tiers: { id: string; name: string; eta: string; description: string; surcharge: string; isActive: boolean }[];
}

export const SETTINGS_FIELDS: { key: NumberKey; label: string; helper: string; max: number }[] = [
  { key: 'shippingFeePerBrand', label: 'Shipping per brand (PKR)', helper: 'Charged once per brand in a checkout.', max: 100_000 },
  { key: 'freeShippingThreshold', label: 'Free shipping from (PKR)', helper: "A brand's shipping is waived at this subtotal.", max: 10_000_000 },
  { key: 'lowStockThreshold', label: 'Low stock at (units)', helper: 'Variants at or below this are flagged.', max: 100_000 },
  { key: 'defaultReturnDays', label: 'Default return window (days)', helper: 'For a brand that sets no policy of its own.', max: 365 },
];

export function settingsFormFrom(s: ShopSettings): SettingsForm {
  return {
    numbers: {
      shippingFeePerBrand: String(s.shippingFeePerBrand),
      freeShippingThreshold: String(s.freeShippingThreshold),
      lowStockThreshold: String(s.lowStockThreshold),
      defaultReturnDays: String(s.defaultReturnDays),
    },
    autoApproveBrands: !!s.autoApproveBrands,
    // Missing means on: products go live without review (the server's default).
    autoApproveProducts: s.autoApproveProducts !== false,
    tiers: (s.deliveryTiers ?? []).map((t) => ({ ...t, surcharge: String(t.surcharge) })),
  };
}

/** Field → problem; empty when the form can be saved. */
export function settingsProblems(f: SettingsForm): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const field of SETTINGS_FIELDS) {
    const raw = f.numbers[field.key];
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isInteger(n) || n < 0 || n > field.max) problems[field.key] = `Enter a whole number from 0 to ${field.max.toLocaleString('en-PK')}.`;
  }
  for (const t of f.tiers) {
    const n = Number(t.surcharge);
    if (t.surcharge.trim() === '' || !Number.isInteger(n) || n < 0) problems[`tier:${t.id}`] = 'Enter a whole amount, 0 or more.';
  }
  if (f.tiers.length && !f.tiers.some((t) => t.isActive)) problems.tiers = 'Checkout needs at least one delivery option on.';
  return problems;
}

/** Everything the server stores — product auto-approval included. */
export function settingsPatch(f: SettingsForm): Partial<ShopSettings> {
  return {
    shippingFeePerBrand: Number(f.numbers.shippingFeePerBrand),
    freeShippingThreshold: Number(f.numbers.freeShippingThreshold),
    lowStockThreshold: Number(f.numbers.lowStockThreshold),
    defaultReturnDays: Number(f.numbers.defaultReturnDays),
    autoApproveBrands: f.autoApproveBrands,
    autoApproveProducts: f.autoApproveProducts,
    deliveryTiers: f.tiers.map((t) => ({ id: t.id, name: t.name, eta: t.eta, description: t.description, surcharge: Number(t.surcharge), isActive: t.isActive })),
  };
}
