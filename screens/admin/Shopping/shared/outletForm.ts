// ============================================================================
// The outlet form's draft. Pure, so it is tested.
// ============================================================================

import type { OutletPayload, ShopColorScheme, ShopOutlet } from '../../../../networks/admin/shoppingApi';
import { colorProblem } from './colors';

export interface OutletDraft {
  name: string;
  slug: string;
  description: string;
  managerName: string;
  isActive: boolean;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  openingHours: string;
  brandId: string | null;
  colorScheme: ShopColorScheme;
}

export const EMPTY_OUTLET: OutletDraft = {
  name: '',
  slug: '',
  description: '',
  managerName: '',
  isActive: true,
  address: '',
  city: '',
  state: '',
  country: 'Pakistan',
  postalCode: '',
  phone: '',
  email: '',
  openingHours: '',
  brandId: null,
  colorScheme: {},
};

export function draftFromOutlet(o: ShopOutlet): OutletDraft {
  return {
    name: o.name ?? '',
    slug: o.slug ?? '',
    description: o.description ?? '',
    managerName: o.managerName ?? '',
    isActive: o.isActive !== false,
    address: o.location?.address ?? '',
    city: o.location?.city ?? '',
    state: o.location?.state ?? '',
    country: o.location?.country ?? '',
    postalCode: o.location?.postalCode ?? '',
    phone: o.phone ?? '',
    email: o.email ?? '',
    openingHours: o.openingHours ?? '',
    brandId: o.brandId ?? null,
    colorScheme: { ...(o.colorScheme ?? {}) },
  };
}

export function outletProblems(d: OutletDraft): Record<string, string> {
  const problems: Record<string, string> = {};
  if (!d.name.trim()) problems.name = 'An outlet needs a name.';
  if (!d.address.trim()) problems.address = 'Where is it? Customers navigate by this.';
  if (!d.city.trim()) problems.city = 'Which city?';
  if (!d.phone.trim()) problems.phone = 'A phone number customers can call.';
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) problems.email = 'That is not an email address.';
  return { ...problems, ...colorSchemeProblems(d.colorScheme) };
}

export function outletPayload(d: OutletDraft, mode: 'create' | 'edit'): OutletPayload {
  return {
    name: d.name.trim(),
    slug: mode === 'create' ? d.slug.trim() || undefined : undefined,
    description: d.description.trim(),
    managerName: d.managerName.trim(),
    isActive: d.isActive,
    location: { address: d.address.trim(), city: d.city.trim(), state: d.state.trim(), country: d.country.trim(), postalCode: d.postalCode.trim() },
    phone: d.phone.trim(),
    email: d.email.trim(),
    openingHours: d.openingHours.trim(),
    colorScheme: Object.fromEntries(COLOR_SCHEME_FIELDS.map(({ key }) => [key, (d.colorScheme[key] ?? '').trim()])) as ShopColorScheme,
    // A changed brand on an existing outlet goes through assign-brand, which checks the brand exists.
    ...(mode === 'create' ? { brandId: d.brandId } : {}),
  };
}

export const COLOR_SCHEME_FIELDS: { key: keyof ShopColorScheme; label: string }[] = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'accentColor', label: 'Accent' },
  { key: 'headerBg', label: 'Header background' },
  { key: 'textOnHeader', label: 'Text on the header' },
];

export const colorSchemeProblems = (scheme: ShopColorScheme): Record<string, string> =>
  Object.fromEntries(
    COLOR_SCHEME_FIELDS.map(({ key }) => [key, colorProblem(scheme[key] ?? '')]).filter((e): e is [string, string] => !!e[1])
  );

/** Whether an outlet matches the search, by its name, brand or city. */
export function matchesOutlet(o: Pick<ShopOutlet, 'name' | 'brandName' | 'location'>, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [o.name, o.brandName, o.location?.city].some((v) => (v ?? '').toLowerCase().includes(q));
}
