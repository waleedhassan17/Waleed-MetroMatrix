// ============================================================================
// Home-service PROVIDER screens — token bridge
//
// The provider side had seven copies of a `theme` object plus eight more files
// inlining a second palette, so the operator app ran on #059669 in some places
// and #10B981 in others while the customer app ran on a third set entirely.
//
// This file is NOT a second design system: every value below is a pointer into
// constants/theme.ts and constants/HomeServiceTheme.ts. It exists so the
// provider screens' existing style rules (`theme.colors.primary`,
// `theme.spacing.lg`) keep working while the values come from one place — the
// same tokens the customer screens use.
//
// New provider screens should import C / HS / S / R / T directly. This shim is
// for the ones that already had a `theme`, and it can be deleted once they are
// all migrated.
//
// HOW DARK MODE ARRIVES THROUGH HERE
// ----------------------------------
// Every provider screen writes `theme.colors.primary` / `theme.colors.border`
// into a module-scope StyleSheet, which is evaluated once at import and cannot
// follow a theme change. Rather than rewriting ~600 of those references across
// 17 screens, the BRIDGE became the thing that varies: a screen calls
// `makeProviderTheme(colors)` inside the component and keeps every existing
// `theme.x` reference exactly as written. One call and one useMemo per file,
// instead of a per-property rewrite.
// ============================================================================

import { HS } from '../../../constants/HomeServiceTheme';
import { C, E, R, S, T } from '../../../constants/theme';
import { MODULE_PALETTES, type ThemeColors } from '../../../theme';

export const makeProviderTheme = (c: ThemeColors) => ({
  colors: {
    primary: c.accent,
    primaryDark: c.accentDeep,
    primaryLight: c.accentSoft,
    background: c.bg,
    surface: c.surface,
    surfaceSunken: c.surfaceSunken,
    text: {
      primary: c.ink,
      secondary: c.inkMuted,
      tertiary: c.inkFaint,
      inverse: c.inkInverse,
    },
    border: c.line,
    borderSoft: c.lineSoft,
    success: c.success,
    successSoft: c.successSoft,
    warning: c.warning,
    warningSoft: c.warningSoft,
    error: c.error,
    errorSoft: c.errorSoft,
    info: c.info,
    infoSoft: c.infoSoft,
    star: c.star,
  },
  spacing: {
    xs: S.xs,
    sm: S.sm,
    md: S.md,
    lg: S.lg,
    xl: S.xl,
    xxl: S.xxl,
  },
  borderRadius: {
    sm: R.chip,
    md: R.card,
    lg: R.card,
    xl: R.sheet,
    full: R.pill,
  },
  elevation: E,
  type: T,
});

export type ProviderTheme = ReturnType<typeof makeProviderTheme>;

/**
 * The light bridge — the exact object this module always exported.
 *
 * It is `makeProviderTheme` applied to the light ramp plus the home-service
 * palette, so a screen that has not been migrated yet compiles unchanged and
 * renders precisely what it always did.
 */
export const theme: ProviderTheme = makeProviderTheme({
  ...C,
  ...MODULE_PALETTES.homeservice,
});

/** Flat shape, for the screens whose local theme was flat rather than nested. */
export const makeFlatProviderTheme = (c: ThemeColors) => ({
  primary: c.accent,
  primaryDark: c.accentDeep,
  primaryLight: c.accentSoft,
  background: c.bg,
  surface: c.surface,
  text: c.ink,
  textSecondary: c.inkMuted,
  textTertiary: c.inkFaint,
  border: c.line,
  error: c.error,
});

export type FlatProviderTheme = ReturnType<typeof makeFlatProviderTheme>;

export const flatTheme: FlatProviderTheme = makeFlatProviderTheme({
  ...C,
  ...MODULE_PALETTES.homeservice,
});

export default theme;
