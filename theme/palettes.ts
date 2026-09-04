// ============================================================================
// Module palettes — the middle layer
//
// Three layers resolve into what a screen sees:
//
//   base      constants/theme.ts — neutrals, type, spacing, radius, elevation.
//             Identical everywhere. This is what makes the app one app.
//   module    this file — an accent set, and nothing else.
//   brand     a vendor's own colours, same shape, overriding the module accent
//             inside their subtree only.
//
// A module layer is DELIBERATELY five colours. The temptation is to give each
// vertical its own greys, its own radii, its own shadows — which is how this
// codebase ended up with `HC` + `DOCTOR_THEME` + `B` + `Colors` + ~72 local
// literal blocks that had all drifted apart. A vertical earns an accent. It
// does not earn a design language.
// ============================================================================

import { HC } from '../constants/HealthcareTheme';
import { HS } from '../constants/HomeServiceTheme';
import { C } from '../constants/theme';
import { B } from '../screens/Shopping/Brand/theme';
import { textOn, tint } from './contrast';

export type ModuleName = 'neutral' | 'healthcare' | 'homeservice' | 'shopping';

export interface ModulePalette {
  /** Primary action, selected state, accent iconography. */
  accent: string;
  /** Pressed state, and accent-coloured TEXT — must pass contrast on white. */
  accentDeep: string;
  /** Soft accent ground: selected chips, tinted wells, highlight rows. */
  accentSoft: string;
  /** Hairline on a selected control. */
  accentLine: string;
  /** Text and icons painted ON `accent`. Never assume this is white. */
  onAccent: string;
}

/**
 * The app before any vertical claims it: auth, role selection, wallet, the
 * splash. Ink rather than a colour, so nothing here implies a module the user
 * has not entered yet.
 */
const neutral: ModulePalette = {
  accent: C.ink,
  accentDeep: '#000000',
  accentSoft: C.surfaceSunken,
  accentLine: C.line,
  onAccent: C.inkInverse,
};

/** Clinical blue. Already consolidated in constants/HealthcareTheme.ts. */
const healthcare: ModulePalette = {
  accent: HC.primary,
  accentDeep: HC.primaryDarker,
  accentSoft: HC.primaryLight,
  accentLine: HC.accentLight,
  onAccent: HC.textInverse,
};

/** Service green. Deliberately not the healthcare blue. */
const homeservice: ModulePalette = {
  accent: HS.accent,
  accentDeep: HS.accentDeep,
  accentSoft: HS.accentSoft,
  accentLine: HS.accentLine,
  onAccent: C.inkInverse,
};

/** Shopping orange — the default a brand overrides. */
const shopping: ModulePalette = {
  accent: B.primary,
  accentDeep: B.primaryDark,
  accentSoft: B.primaryLight,
  accentLine: tint(B.primary, 0.24),
  onAccent: textOn(B.primary),
};

export const MODULE_PALETTES: Record<ModuleName, ModulePalette> = {
  neutral,
  healthcare,
  homeservice,
  shopping,
};

/**
 * A brand's three stored colours, resolved into the same five-slot shape every
 * other layer uses — which is the whole point: shared components read
 * `colors.accent`, so they recolour for a brand without knowing brands exist.
 *
 * `secondaryColor` becomes `accentDeep`, the pressed/deep role. It previously
 * had no consumer anywhere in the app: brands could set it and nothing ever
 * rendered it. `accentSoft` and `accentLine` are alpha tints of the primary —
 * a brand supplies three colours, not five, and inventing two more by guessing
 * at hue relationships goes wrong far more often than a tint does.
 */
export const brandPalette = (
  primaryColor?: string | null,
  secondaryColor?: string | null,
  accentColor?: string | null,
): ModulePalette | null => {
  if (!primaryColor) return null;

  return {
    accent: primaryColor,
    accentDeep: secondaryColor || primaryColor,
    accentSoft: tint(primaryColor, 0.1),
    accentLine: tint(primaryColor, 0.28),
    onAccent: textOn(primaryColor),
    // `accentColor` stays out of the five slots on purpose — it is a highlight
    // (cart badge, sale flag), not a surface. Screens that want it read
    // `useTheme().brandAccent`.
  };
};
