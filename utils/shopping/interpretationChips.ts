// ============================================================================
// The filters natural-language search understood, as removable chips:
// "red nike shoes under 3k" → [Red] [Nike] [Shoes] [Under PKR 3,000].
//
// Inside a storefront the store is already the brand filter (the screen's own
// brandId wins on the server), so a brand chip there would describe a filter
// that is not being applied — it is left out.
// ============================================================================

import type { InterpretationChipKey, ProductQueryInterpretation } from '../../types/shopping';

export interface InterpretationChip {
  key: InterpretationChipKey;
  label: string;
}

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString('en-US')}`;
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function interpretationChips(
  interp: ProductQueryInterpretation | null | undefined,
  { scopedToBrand = false }: { scopedToBrand?: boolean } = {}
): InterpretationChip[] {
  if (!interp) return [];
  const chips: InterpretationChip[] = [];
  if (interp.category) chips.push({ key: 'category', label: title(interp.category) });
  if (interp.brandName && !scopedToBrand) chips.push({ key: 'brand', label: interp.brandName });
  if (interp.color) chips.push({ key: 'color', label: title(interp.color) });
  if (interp.gender) chips.push({ key: 'gender', label: title(interp.gender) });
  const { minPrice: lo, maxPrice: hi } = interp;
  if (lo && hi) chips.push({ key: 'price', label: `${pkr(lo)}–${pkr(hi).replace('PKR ', '')}` });
  else if (hi) chips.push({ key: 'price', label: `Under ${pkr(hi)}` });
  else if (lo) chips.push({ key: 'price', label: `Over ${pkr(lo)}` });
  return chips;
}
