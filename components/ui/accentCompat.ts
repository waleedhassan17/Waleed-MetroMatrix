import { ThemeColors } from '../../theme';

// ============================================================================
// The module accent, for the primitives that used to hardcode one.
//
// WHAT THIS USED TO DO
// --------------------
// Button, Chip, SectionHeader and HeroBanner reached for `HS` — the home-service
// green — directly, because they were written when home services was the only
// vertical here. AppBar was later taught to read `useTheme().colors` and these
// were not, so a primary Button on a HEALTHCARE screen rendered green rather
// than clinical blue, across 35 screens.
//
// This function was the holding pattern: it returned the theme accent in dark
// (where the green measures 1.6:1 against the canvas and is simply unreadable)
// and kept the green in light, so no shipped light screen changed appearance.
//
// It now returns the module accent in BOTH. Once dark became an opt-in the user
// flips at will rather than something the OS chose for them, the same button
// changing colour between the two modes stopped being invisible: switch a
// healthcare screen to dark and the button went green -> blue. Holding the bug
// in one mode only was no longer cheaper than fixing it.
//
// The old light branch also put white on `HS.accent` at 3.77 — below AA. That
// goes with it.
//
// This is now a thin pass-through and exists only so the four call sites keep
// one shape. Inlining `useTheme().colors` at each of them and deleting this file
// is a fine follow-up.
// ============================================================================

export interface UIAccent {
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentLine: string;
  onAccent: string;
}

export const uiAccent = (c: ThemeColors, _isDark: boolean): UIAccent => ({
  accent: c.accent,
  accentDeep: c.accentDeep,
  accentSoft: c.accentSoft,
  accentLine: c.accentLine,
  onAccent: c.onAccent,
});
