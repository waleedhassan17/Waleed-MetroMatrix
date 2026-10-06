// ============================================================================
// Brand and outlet colours are DATA — the vendor's storefront theme the admin
// edits — not the console's own styling. Pure, so it is tested.
// ============================================================================

import { COLOR_FALLBACKS } from '../../../../constants/ProductColors';

/** "#E67E22" or "#E67". The server checks the same and normalises case. */
export const isHexColor = (value: string): boolean => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

/** Quick picks, by name, from the shared colour list. */
export const COLOR_SWATCHES = ['orange', 'red', 'maroon', 'pink', 'purple', 'blue', 'navy', 'teal', 'green', 'olive', 'gold', 'charcoal']
  .map((name) => ({ name, hex: COLOR_FALLBACKS[name] }))
  .filter((s): s is { name: string; hex: string } => typeof s.hex === 'string');

/** A colour field's problem, or null. Empty is fine: the server's default applies. */
export const colorProblem = (value: string): string | null =>
  !value.trim() || isHexColor(value) ? null : 'Use a hex colour like #E67E22.';
