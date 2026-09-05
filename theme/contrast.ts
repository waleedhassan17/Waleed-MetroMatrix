// ============================================================================
// Contrast — pick a readable ink for an arbitrary background
//
// A brand picks its own primary colour, so nothing downstream may assume white
// text is legible on it. Every place that paints text on a brand or accent
// ground asks `textOn()` instead of hardcoding '#FFFFFF'.
//
// WHY NOT THE OLD HELPER
// ----------------------
// hooks/useBrandTheme.ts carried a `getTextOnColor` whose comment said "WCAG
// formula" but whose body was `(0.299r + 0.587g + 0.114b) / 255 > 0.5` — that
// is YIQ perceived brightness, not relative luminance: it skips the sRGB gamma
// expansion entirely and uses the wrong coefficients. It disagrees with the
// real formula around mid-tones, which is exactly where the decision is close
// and getting it wrong is visible. It also bailed to white for any input that
// was not exactly six hex digits, so a three-digit hex — a perfectly ordinary
// thing to type into a colour field — produced white-on-white.
// ============================================================================

import { C } from '../constants/theme';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Accepts `#abc`, `#aabbcc`, `#aabbccff` and the same without the hash.
 * Returns null for anything else — callers decide what to do about it rather
 * than silently receiving a colour that was never asked for.
 */
export const parseHex = (value?: string | null): RGB | null => {
  if (!value) return null;
  const hex = value.trim().replace(/^#/, '');

  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  // The 8-digit form carries alpha, which contrast against an unknown backdrop
  // cannot account for. Use the colour and ignore the alpha.
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
};

/** True for a string this module can actually reason about. */
export const isHexColor = (value?: string | null): boolean => parseHex(value) !== null;

const srgbToLinear = (channel: number): number => {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export const relativeLuminance = ({ r, g, b }: RGB): number =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/**
 * WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white).
 * Returns 1 — the worst possible — if either colour is unparseable, so a bad
 * value can never be mistaken for a passing one.
 */
export const contrastRatio = (a: string, b: string): number => {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 1;

  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** WCAG AA for body text. */
export const AA_BODY = 4.5;
/** WCAG AA for text at 18pt+, or 14pt+ bold. Also the bar for icons. */
export const AA_LARGE = 3;

/**
 * The more readable of the two inks on `background`.
 *
 * Falls back to the light ink when the background cannot be parsed — that is
 * the same behaviour as before, but now it only happens for genuinely
 * unreadable input rather than for every three-digit hex.
 */
export const textOn = (
  background?: string | null,
  dark: string = C.ink,
  light: string = C.inkInverse,
): string => {
  if (!parseHex(background)) return light;
  return contrastRatio(dark, background as string) >= contrastRatio(light, background as string)
    ? dark
    : light;
};

/**
 * An 8-digit hex is the cheapest way to get a tint of a brand colour without a
 * colour-space library, and it is what BrandStoreScreen already did by hand.
 * `alpha` is 0–1. Composites over whatever is behind it, so only use it on a
 * light surface.
 */
export const tint = (hex: string, alpha: number): string => {
  const rgb = parseHex(hex);
  if (!rgb) return 'transparent';
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  const two = (n: number) => n.toString(16).padStart(2, '0');
  return `#${two(rgb.r)}${two(rgb.g)}${two(rgb.b)}${a}`;
};

const two = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/**
 * Opaque blend of two colours — `amount` 0 returns `from`, 1 returns `to`.
 *
 * This is `tint()`'s counterpart for a dark surface. `tint()` returns an
 * 8-digit hex and lets the compositor do the work, which means the result
 * depends on whatever happens to be painted behind it: the same call yields a
 * pale wash on white and a barely-visible film on near-black. A tinted well
 * has to be a KNOWN colour, so this composites against a named ground and
 * returns six digits.
 */
export const mix = (from: string, to: string, amount: number): string => {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;

  const t = Math.min(Math.max(amount, 0), 1);
  return `#${two(a.r + (b.r - a.r) * t)}${two(a.g + (b.g - a.g) * t)}${two(a.b + (b.b - a.b) * t)}`;
};

/**
 * Lighten `hex` toward white until it clears `target` against `ground`.
 * Returns it UNCHANGED when it already passes.
 *
 * WHY THIS EXISTS
 * ---------------
 * A vendor picks their own brand colour against a white store. On a dark
 * surface a deep navy (#1A1A2E) measures 1.02:1 — invisible. Refusing to draw
 * it is not an option and neither is overriding it with our own accent, so it
 * gets lifted just far enough to be legible and no further: a brand that
 * already works keeps its exact hex, byte for byte.
 *
 * Lifting toward white rather than rotating hue is deliberate — it preserves
 * the hue the vendor chose, which is the part they actually care about.
 */
export const lift = (hex: string, target: number, ground: string): string => {
  if (!parseHex(hex) || !parseHex(ground)) return hex;

  let amount = 0;
  let out = hex;
  // 2% steps: fine enough that nothing is lifted noticeably past the bar,
  // coarse enough to terminate in at most 50 iterations.
  while (contrastRatio(out, ground) < target && amount < 1) {
    amount += 0.02;
    out = mix(hex, '#FFFFFF', amount);
  }
  return out;
};
