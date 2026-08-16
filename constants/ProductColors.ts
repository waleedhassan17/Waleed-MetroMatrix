// ============================================
// Shopping — product colour swatches
// Shared by the product detail screen, the cart
// and the vendor variant editor so a colour name
// resolves to the same swatch everywhere.
// ============================================

/**
 * Fallback swatch for a variant that carries a colour name but no `colorCode`.
 * Seeded products now get a real `colorCode` from the backend, so this covers
 * vendor-typed colours and any legacy rows. Keys are lowercased.
 */
export const COLOR_FALLBACKS: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', grey: '#95A5A6', gray: '#95A5A6',
  charcoal: '#36454F', navy: '#1B2838', blue: '#3498DB', teal: '#008080',
  red: '#E74C3C', maroon: '#800000', pink: '#E91E63', purple: '#8B5CF6',
  lavender: '#B57EDC', green: '#27AE60', olive: '#708238', yellow: '#F1C40F',
  mustard: '#D4A017', orange: '#E67E22', brown: '#8B5E3C', beige: '#E8DCC4',
  cream: '#FFFDD0', khaki: '#C3B091',
  // Catalogue colours, matching the backend's COLOR_HEX.
  'anthracite grey': '#3A3A3C', 'chocolate brown': '#5C4033',
  'crimson red': '#B01B2E', 'dark brown': '#4A322A', 'dark olive': '#4F5A31',
  gold: '#C9A227', 'light grey marl': '#C8CBCC', 'mlik rose': '#E8B4B8',
  mushroom: '#BDB0A0', 'off white': '#F5F2EA', sand: '#D8C9A3',
  silver: '#C0C0C0', taupe: '#B0A08E', twilight: '#4A5A75',
  'vanilla ice': '#F3E5D0',
};

/** Neutral swatch for colours we have no honest hex for (e.g. "Multi"). */
export const NEUTRAL_SWATCH = '#B0B4BA';

/**
 * Resolves a swatch colour: the variant's own `colorCode` wins, then an exact
 * name match, then the last recognised word in the name — so "Light Grey Marl"
 * lands on grey and "Chocolate Brown" on brown instead of all going neutral.
 */
export function swatchColor(name?: string | null, code?: string | null): string {
  if (code) return code;

  const key = (name || '').trim().toLowerCase();
  if (!key) return NEUTRAL_SWATCH;

  const exact = COLOR_FALLBACKS[key];
  if (exact) return exact;

  const words = key.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const hit = COLOR_FALLBACKS[words[i]];
    if (hit) return hit;
  }

  return NEUTRAL_SWATCH;
}
