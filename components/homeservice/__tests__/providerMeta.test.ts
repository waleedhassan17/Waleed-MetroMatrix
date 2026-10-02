import { providerMetaLine } from '../providerMeta';

const base: any = { rating: 4.83, reviews: 32, distanceKm: null, distanceApprox: false, availableNow: false };

describe('providerMetaLine', () => {
  it('shows only what is known', () => {
    expect(providerMetaLine(base)).toBe('4.8★ (32)');
    expect(providerMetaLine({ ...base, distanceKm: 1.2, availableNow: true })).toBe('4.8★ (32) · 1.2 km · Available now');
  });

  it('marks an approximate distance and a provider with no reviews yet', () => {
    expect(providerMetaLine({ ...base, reviews: 0, distanceKm: 3, distanceApprox: true })).toBe('New · ~3 km');
  });
});
