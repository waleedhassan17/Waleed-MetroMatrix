import { EMPTY_BRAND, brandPayload, brandProblems, draftFromBrand, slugify } from '../shared/brandForm';
import { nextDecision } from '../shared/brandStatus';
import { COLOR_SWATCHES, colorProblem, isHexColor } from '../shared/colors';
import { NEXT_ORDER_STATUSES, humanise, paymentLabel } from '../shared/orders';
import { EMPTY_OUTLET, draftFromOutlet, matchesOutlet, outletPayload, outletProblems } from '../shared/outletForm';
import { settingsFormFrom, settingsPatch, settingsProblems } from '../shared/settingsForm';
import type { ShopBrand, ShopOutlet, ShopSettings } from '../../../../networks/admin/shoppingApi';

describe('colours', () => {
  it('accepts #RGB and #RRGGBB only', () => {
    expect(isHexColor('#E67E22')).toBe(true);
    expect(isHexColor('#e67')).toBe(true);
    expect(isHexColor('E67E22')).toBe(false);
    expect(isHexColor('#E67E2')).toBe(false);
    expect(isHexColor('orange')).toBe(false);
  });
  it('an empty colour is fine (the default applies); a bad one is not', () => {
    expect(colorProblem('')).toBeNull();
    expect(colorProblem('#123456')).toBeNull();
    expect(colorProblem('#12345')).toMatch(/hex/);
  });
  it('offers swatches from the shared colour list', () => {
    expect(COLOR_SWATCHES.length).toBeGreaterThan(6);
    expect(COLOR_SWATCHES.every((s) => isHexColor(s.hex))).toBe(true);
  });
});

describe('brand form', () => {
  const draft = { ...EMPTY_BRAND, name: 'Outfitters', description: 'Clothes', contactEmail: 'hi@outfitters.pk' };

  it('slugs a name for links', () => {
    expect(slugify(' Outfitters & Co. ')).toBe('outfitters-co');
  });

  it('asks for a name, a description, a valid email and whole return days', () => {
    expect(brandProblems(draft)).toEqual({});
    expect(Object.keys(brandProblems(EMPTY_BRAND)).sort()).toEqual(['contactEmail', 'description', 'name']);
    expect(brandProblems({ ...draft, contactEmail: 'nope' }).contactEmail).toBeTruthy();
    expect(brandProblems({ ...draft, returnDays: '2.5' }).returnDays).toBeTruthy();
    expect(brandProblems({ ...draft, primaryColor: '#zzz' }).primaryColor).toBeTruthy();
  });

  it('leaves empty colours out on create so the server defaults apply, and clears them on edit', () => {
    const created = brandPayload(draft, 'create');
    expect(created).not.toHaveProperty('primaryColor', '');
    expect(created.primaryColor).toBeUndefined();
    expect(created.isActive).toBe(true);
    const edited = brandPayload(draft, 'edit');
    expect(edited.primaryColor).toBe('');
    expect(edited).not.toHaveProperty('isActive');
    expect(created.policies).toEqual({ returnDays: 7, shippingInfo: '', paymentMethods: [] });
  });

  it('round-trips a brand', () => {
    const brand = {
      id: 'b1',
      brandId: 'b1',
      name: 'Dev Threads',
      slug: 'dev-threads',
      status: 'suspended',
      primaryColor: '#E67E22',
      categories: ['Men'],
      policies: { returnDays: 14, paymentMethods: ['cod'] },
      socialLinks: { instagram: 'https://instagram.com/dev' },
    } as ShopBrand;
    const d = draftFromBrand(brand);
    expect(d).toMatchObject({ name: 'Dev Threads', returnDays: '14', paymentMethods: ['cod'], instagram: 'https://instagram.com/dev', isActive: false });
  });
});

describe('brand decisions', () => {
  it('approves pending, suspends active, reactivates suspended', () => {
    expect(nextDecision('pending')).toMatchObject({ status: 'active', verb: 'Approve' });
    expect(nextDecision('active')).toMatchObject({ status: 'suspended', verb: 'Suspend', destructive: true });
    expect(nextDecision('suspended')).toMatchObject({ status: 'active', verb: 'Reactivate' });
    expect(nextDecision(undefined)).toBeNull();
  });
});

describe('orders', () => {
  it('mirrors the server state machine', () => {
    expect(NEXT_ORDER_STATUSES.pending).toEqual(['confirmed', 'cancelled']);
    expect(NEXT_ORDER_STATUSES.delivered).toEqual(['returned']);
    expect(NEXT_ORDER_STATUSES.refunded).toEqual([]);
  });
  it('names payment states and raw keys', () => {
    expect(paymentLabel('pending')).toBe('Not paid yet');
    expect(paymentLabel('mystery')).toBe('mystery');
    expect(humanise('out_for_delivery')).toBe('out for delivery');
  });
});

describe('outlet form', () => {
  const draft = { ...EMPTY_OUTLET, name: 'Gulberg', address: '25-A Main Blvd', city: 'Lahore', phone: '0300' };

  it('asks for a name, an address, a city and a phone', () => {
    expect(outletProblems(draft)).toEqual({});
    expect(Object.keys(outletProblems(EMPTY_OUTLET)).sort()).toEqual(['address', 'city', 'name', 'phone']);
    expect(outletProblems({ ...draft, colorScheme: { headerBg: 'blue' } }).headerBg).toBeTruthy();
  });

  it('sends the brand only on create (an edit goes through assign-brand)', () => {
    expect(outletPayload({ ...draft, brandId: 'b1' }, 'create').brandId).toBe('b1');
    expect(outletPayload({ ...draft, brandId: 'b1' }, 'edit')).not.toHaveProperty('brandId');
    expect(outletPayload(draft, 'create').location).toMatchObject({ address: '25-A Main Blvd', city: 'Lahore', country: 'Pakistan' });
  });

  it('round-trips an outlet and searches by name, brand or city', () => {
    const outlet = { id: 'o1', outletId: 'o1', name: 'Gulberg', slug: 'gulberg', isActive: false, brandId: 'b1', brandName: 'Dev Threads', location: { city: 'Lahore' } } as ShopOutlet;
    expect(draftFromOutlet(outlet)).toMatchObject({ name: 'Gulberg', isActive: false, brandId: 'b1', city: 'Lahore' });
    expect(matchesOutlet(outlet, 'threads')).toBe(true);
    expect(matchesOutlet(outlet, 'lahore')).toBe(true);
    expect(matchesOutlet(outlet, 'karachi')).toBe(false);
    expect(matchesOutlet(outlet, '  ')).toBe(true);
  });
});

describe('shopping settings form', () => {
  const settings: ShopSettings = {
    shippingFeePerBrand: 150,
    freeShippingThreshold: 3000,
    lowStockThreshold: 5,
    defaultReturnDays: 7,
    autoApproveBrands: false,
    autoApproveProducts: false,
    deliveryTiers: [
      { id: 'standard', name: 'Standard', eta: '3–5 days', description: '', surcharge: 0, isActive: true },
      { id: 'express', name: 'Express', eta: 'Next day', description: '', surcharge: 250, isActive: false },
    ],
  };

  it('sends product auto-approval with everything else (the old screen dropped it)', () => {
    const form = settingsFormFrom(settings);
    const patch = settingsPatch({ ...form, autoApproveProducts: true });
    expect(patch.autoApproveProducts).toBe(true);
    expect(patch).toMatchObject({ shippingFeePerBrand: 150, autoApproveBrands: false });
    expect(patch.deliveryTiers?.[1]).toMatchObject({ id: 'express', surcharge: 250, isActive: false });
  });

  it('a missing product setting means products go live (the server default)', () => {
    expect(settingsFormFrom({ ...settings, autoApproveProducts: undefined }).autoApproveProducts).toBe(true);
  });

  it('needs whole numbers in range and one delivery option on', () => {
    const form = settingsFormFrom(settings);
    expect(settingsProblems(form)).toEqual({});
    expect(settingsProblems({ ...form, numbers: { ...form.numbers, defaultReturnDays: '400' } }).defaultReturnDays).toBeTruthy();
    expect(settingsProblems({ ...form, tiers: form.tiers.map((t) => ({ ...t, isActive: false })) }).tiers).toBeTruthy();
    expect(settingsProblems({ ...form, tiers: [{ ...form.tiers[0], surcharge: '' }] })['tier:standard']).toBeTruthy();
  });
});
