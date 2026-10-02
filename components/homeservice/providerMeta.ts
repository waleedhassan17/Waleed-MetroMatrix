import type { Provider } from '../../models/serviceProviders';

export type TradeKey = 'electricians' | 'plumbers' | 'ac-repairers';

/** Plural trade names for buttons: "See all plumbers". */
export const TRADE_PLURAL: Record<TradeKey, string> = {
  electricians: 'electricians',
  plumbers: 'plumbers',
  'ac-repairers': 'AC technicians',
};

/** "4.8★ (32) · 1.2 km · Available now" — only the parts that are known. */
export function providerMetaLine(p: Provider): string {
  const parts: string[] = [];
  if (p.reviews > 0) parts.push(`${p.rating.toFixed(1)}★ (${p.reviews})`);
  else parts.push('New');
  if (typeof p.distanceKm === 'number') parts.push(`${p.distanceApprox ? '~' : ''}${p.distanceKm} km`);
  if (p.availableNow) parts.push('Available now');
  return parts.join(' · ');
}
