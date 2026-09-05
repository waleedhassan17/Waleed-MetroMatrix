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
import { C, DARK_C, ThemeMode } from '../constants/theme';
import { B } from '../screens/Shopping/Brand/theme';
import { AA_BODY, AA_LARGE, lift, mix, textOn, tint } from './contrast';

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
  /**
   * How this module's app bar is painted.
   *
   *   'surface'  white ground, ink title — the app bar recedes and the content
   *              leads. Right for a module whose screens are dense with their
   *              own colour (a store full of product photography).
   *   'accent'   the module's own colour, edge to edge. Right for a module that
   *              wants to announce which part of the app you are in.
   *
   * A screen can still override it per instance, but the module's answer is the
   * default so a header cannot drift screen by screen — which is exactly how
   * this codebase ended up with seventeen different ones.
   */
  barTone: 'surface' | 'accent';
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
  // Nothing has claimed this part of the app yet, so the bar stays quiet.
  barTone: 'surface',
};

/** Clinical blue. Already consolidated in constants/HealthcareTheme.ts. */
const healthcare: ModulePalette = {
  accent: HC.primary,
  accentDeep: HC.primaryDarker,
  accentSoft: HC.primaryLight,
  accentLine: HC.accentLight,
  onAccent: HC.textInverse,
  barTone: 'surface',
};

/** Service green. Deliberately not the healthcare blue. */
const homeservice: ModulePalette = {
  accent: HS.accent,
  accentDeep: HS.accentDeep,
  accentSoft: HS.accentSoft,
  accentLine: HS.accentLine,
  onAccent: C.inkInverse,
  // Home services announces itself. The bar is painted in the module green —
  // see AppBar for why it uses `accentDeep` rather than `accent`.
  barTone: 'accent',
};

/** Shopping orange — the default a brand overrides. */
const shopping: ModulePalette = {
  accent: B.primary,
  accentDeep: B.primaryDark,
  accentSoft: B.primaryLight,
  accentLine: tint(B.primary, 0.24),
  onAccent: textOn(B.primary),
  // The brand's own screens keep a white bar: a vendor picks the primary, and
  // an arbitrary hex behind the page title is where legibility goes wrong.
  // BrandHeader carries the brand as a stripe instead.
  barTone: 'surface',
};

export const MODULE_PALETTES: Record<ModuleName, ModulePalette> = {
  neutral,
  healthcare,
  homeservice,
  shopping,
};

// ── Dark ────────────────────────────────────────────────────────────────────
//
// THE ROLES INVERT — THEY ARE NOT JUST DARKER VERSIONS
// ----------------------------------------------------
// `accentDeep` exists because an accent picked to read AS text on white is too
// light to sit BEHIND text (see the light `homeservice` note above). On a dark
// ground that relationship flips: accent-coloured TEXT now has to be LIGHTER
// than the accent, not darker. So `accentDeep` is the lighter tone here. That
// sounds wrong until you remember what the name means — "the deep end of the
// contrast range against this mode's ground", which is up, not down.
//
// Consequently every accent below is a light tone whose readable ink is DARK,
// and `onAccent` is computed by `textOn()` rather than assumed to be white.
// A migrated screen must paint accent buttons with `colors.onAccent`; a
// hardcoded '#FFFFFF' on one of these fills measures ~2:1 and is unreadable.
//
// Measured against `DARK_C.surface`:
//
//                accent (icon)   accentDeep (text)   onAccent (on accent)
//   healthcare       6.74              9.38                 7.04
//   homeservice      8.72             11.00                 9.10
//   shopping         7.88             10.26                 8.22
//   neutral         15.14             16.76                15.80
//
// WHY EVERY barTone IS 'surface' HERE
// -----------------------------------
// A full-bleed saturated bar that works on a light app reads as a slab of
// colour on a dark one, and home services' `accentDeep` is now a LIGHT green —
// painting the bar with it would put a bright band across the top of a dark
// screen and force the status icons back to dark. The module still announces
// itself through accented content; AppBar keeps a quieter tinted option for
// screens that ask for `tone="accent"` explicitly.

const neutralDark: ModulePalette = {
  accent: DARK_C.ink,
  accentDeep: '#FFFFFF',
  accentSoft: DARK_C.lineSoft,
  accentLine: '#3A3532',
  onAccent: textOn(DARK_C.ink),
  barTone: 'surface',
};

const healthcareDark: ModulePalette = {
  accent: '#6BA5FF',
  accentDeep: '#9CC4FF',
  accentSoft: '#16263C',
  accentLine: '#294C77',
  onAccent: textOn('#6BA5FF'),
  barTone: 'surface',
};

const homeserviceDark: ModulePalette = {
  accent: '#34D399',
  accentDeep: '#6EE7B7',
  accentSoft: '#0F2C23',
  accentLine: '#1E5546',
  onAccent: textOn('#34D399'),
  barTone: 'surface',
};

const shoppingDark: ModulePalette = {
  accent: '#F59E4B',
  accentDeep: '#FBBF7D',
  accentSoft: '#33210F',
  accentLine: '#6B421C',
  onAccent: textOn('#F59E4B'),
  barTone: 'surface',
};

export const MODULE_PALETTES_DARK: Record<ModuleName, ModulePalette> = {
  neutral: neutralDark,
  healthcare: healthcareDark,
  homeservice: homeserviceDark,
  shopping: shoppingDark,
};

/**
 * The palette for a module in a mode. Falls back to neutral for an unknown
 * name, the way the provider always has.
 *
 * `MODULE_PALETTES` stays exported unchanged so the three files importing it
 * directly keep compiling; they get the light set, which is what they were
 * already getting.
 */
export const modulePalette = (name: ModuleName, mode: ThemeMode): ModulePalette =>
  (mode === 'dark' ? MODULE_PALETTES_DARK : MODULE_PALETTES)[name] ??
  (mode === 'dark' ? neutralDark : neutral);

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
  barTone: ModulePalette['barTone'] = 'surface',
  mode: ThemeMode = 'light',
): ModulePalette | null => {
  if (!primaryColor) return null;

  // A vendor picked their colour against a white store, so on dark it may be
  // anything from perfect to invisible (#1A1A2E measures 1.02:1). `lift` raises
  // it only as far as legibility needs and leaves a working brand untouched —
  // the shopping default #E67E22 already measures 5.88 and comes back
  // byte-identical. The tinted grounds composite against the real dark surface
  // rather than relying on alpha, which would otherwise wash out to nothing.
  if (mode === 'dark') {
    const ground = DARK_C.surface;
    const accent = lift(primaryColor, AA_LARGE, ground);

    return {
      accent,
      accentDeep: lift(secondaryColor || primaryColor, AA_BODY, ground),
      accentSoft: mix(ground, accent, 0.14),
      accentLine: mix(ground, accent, 0.32),
      onAccent: textOn(accent),
      barTone,
    };
  }

  return {
    accent: primaryColor,
    accentDeep: secondaryColor || primaryColor,
    accentSoft: tint(primaryColor, 0.1),
    accentLine: tint(primaryColor, 0.28),
    onAccent: textOn(primaryColor),
    barTone,
    // `accentColor` stays out of the five slots on purpose — it is a highlight
    // (cart badge, sale flag), not a surface. Screens that want it read
    // `useTheme().brandAccent`.
  };
};
