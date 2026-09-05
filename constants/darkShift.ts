import { AA_BODY, lift, mix } from '../theme/contrast';
import { DARK_C, ramp, type Ramp, type ThemeMode } from './theme';

// ============================================================================
// Shifting a light-tuned palette into dark, one rule per ROLE.
//
// WHY THIS EXISTS
// ---------------
// The healthcare screens carry 22 near-identical `const THEME = { … }` blocks
// and `HC` carries a 23rd. Between them that is ~2,000 colour literals, all
// chosen against white. Hand-picking a dark counterpart for each is both a
// week of work and a guarantee that the amber in one screen drifts from the
// amber in the next — which is exactly how this codebase ended up with five
// palettes in the first place.
//
// So dark is DERIVED, by role:
//
//   hue()     a saturated colour used as text, an icon or a fill. Raised until
//             it clears AA against the dark card, and no further — a colour
//             that already reads comes back untouched, so the clinical blue
//             stays this app's blue.
//   ground()  a pale wash sitting behind a hue (#EAF3FF, #ECFDF5 …). These are
//             the ones that break hardest: near-white is a glare panel on a
//             dark page. Rebuilt by mixing the HUE into the dark surface, so
//             the pair still reads as one family.
//   n()       a neutral — a page, a card, body text, a hairline. These come
//             straight from the ramp, because that is the entire point of
//             having one.
//
// LIGHT IS ALWAYS THE LITERAL YOU PASS IN
// ---------------------------------------
// Every helper returns its argument unchanged in light mode. A screen migrated
// through here renders in light exactly as it did before, byte for byte, which
// is what makes it safe to convert 22 screens in one pass.
// ============================================================================

export interface DarkShift {
  /** A saturated hue: text, icon, or fill. */
  hue: (hex: string) => string;
  /** A pale ground. Pass the hue it belongs behind. */
  ground: (paleHex: string, hue: string) => string;
  /** A neutral, named by its role in the ramp. */
  n: (hex: string, role: keyof Ramp) => string;
  /** A two-stop gradient. Dark keeps it dark — a bright ramp is a lamp. */
  grad: (stops: [string, string]) => [string, string];
  colors: Ramp;
  isDark: boolean;
}

export const darkShift = (mode: ThemeMode): DarkShift => {
  const isDark = mode === 'dark';
  const colors = ramp(mode);

  return {
    isDark,
    colors,
    hue: (hex) => (isDark ? lift(hex, AA_BODY, DARK_C.surface) : hex),
    ground: (paleHex, hue) => (isDark ? mix(DARK_C.surface, hue, 0.16) : paleHex),
    n: (hex, role) => (isDark ? colors[role] : hex),
    grad: (stops) =>
      isDark
        ? [mix(DARK_C.surface, stops[0], 0.5), mix(DARK_C.surface, stops[1], 0.4)]
        : stops,
  };
};
