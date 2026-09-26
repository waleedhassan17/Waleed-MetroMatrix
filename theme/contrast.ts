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
 * Status-bar glyph style for the surface directly beneath the status bar.
 *
 * Screens with a coloured header used to hardcode `barStyle="light-content"`
 * beside `backgroundColor={THEME.primary}`, which was true only for the light
 * palette they were written against. In dark, `darkShift`'s `hue()` RAISES a
 * saturated colour until it clears AA against the dark card — so the header goes
 * lighter, and the white glyphs that were correct on the original blue lose
 * contrast on the lifted one.
 *
 * WHY THIS IS NOT `textOn`
 * ------------------------
 * `textOn` picks the winner of a head-to-head comparison, and on a mid-tone
 * brand colour the DARK ink usually wins by a nose: white on the healthcare
 * blue #2A7FFF measures 3.76 while the dark ink measures 4.39. Following that
 * would put dark status-bar glyphs directly above a header whose own title is
 * white — which reads as a bug, not as a contrast decision.
 *
 * The status bar's job is to agree with the header it sits on, so the question
 * is "is this ground dark enough to carry white?", not "which ink wins". Light
 * glyphs stay unless white actually FAILS — AA_LARGE, because these are icons
 * and a clock, not body copy. Every shipped light header keeps the glyphs it
 * has; only a ground lifted past the point where white stops working flips.
 */
export const barStyleOn = (
  background?: string | null,
): 'light-content' | 'dark-content' => {
  if (!parseHex(background)) return 'light-content';
  return contrastRatio(C.inkInverse, background as string) >= AA_LARGE
    ? 'light-content'
    : 'dark-content';
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

/**
 * A 90%-white subtitle, composited against the ground it sits on.
 *
 * `inkInverseSoft` is `rgba(255,255,255,0.9)`, and an alpha colour has no
 * contrast ratio of its own — it has to be flattened against what is behind it
 * before it can be measured. Measuring the pure white instead overstates the
 * result by roughly a point and a half, which is the difference between
 * passing and failing on every accent in this app.
 */
export const softInkOn = (ground: string, alpha = 0.9): string => {
  const rgb = parseHex(ground);
  if (!rgb) return C.inkInverse;
  const blend = (c: number) => Math.round(alpha * 255 + (1 - alpha) * c);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(blend(rgb.r))}${hex(blend(rgb.g))}${hex(blend(rgb.b))}`;
};

/**
 * The two stops of a module page header's gradient, derived from the module's
 * `accentDeep`.
 *
 * THE RULE IS A MEASUREMENT, NOT A NUMBER. The header carries a white title
 * and a 90%-white subtitle, so EVERY point of the gradient has to clear
 * AA_BODY for that subtitle — not just the dark end. A gradient that fails
 * across part of its area does not look broken; it looks like a slightly
 * different colour, which is why this is computed rather than eyeballed.
 *
 * Home services and shopping needed different answers from the same intent:
 *
 *   home services  accentDeep #047857  subtitle 4.78  already passes
 *   shopping       accentDeep #D35400  subtitle 3.67  needs one step darker
 *
 * Orange is intrinsically lighter than green at the same role, so hard-coding
 * "start at accentDeep" was right for one module and wrong for the other.
 * This darkens toward ink until the subtitle clears, then takes one more step
 * for the far stop — so the gradient is always visible and never illegible.
 *
 * Pass the result through `darkShift(mode).grad()` at the call site; dark mode
 * is a separate concern and belongs with the component.
 */
export const headerGradientStops = (accentDeep: string): [string, string] => {
  const STEP = 0.22;
  let start = accentDeep;
  // At most a handful of steps: each removes ~22% of the remaining lightness,
  // so anything legible is reached well inside this bound.
  for (let i = 0; i < 8; i += 1) {
    if (contrastRatio(softInkOn(start), start) >= AA_BODY) break;
    start = mix(start, C.ink, STEP);
  }
  return [start, mix(start, C.ink, STEP)];
};
