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
// ============================================================================

import { HS } from '../../../constants/HomeServiceTheme';
import { C, E, R, S, T } from '../../../constants/theme';

export const theme = {
  colors: {
    primary: HS.accent,
    primaryDark: HS.accentDeep,
    primaryLight: HS.accentSoft,
    background: C.bg,
    surface: C.surface,
    surfaceSunken: C.surfaceSunken,
    text: {
      primary: C.ink,
      secondary: C.inkMuted,
      tertiary: C.inkFaint,
      inverse: C.inkInverse,
    },
    border: C.line,
    borderSoft: C.lineSoft,
    success: C.success,
    successSoft: C.successSoft,
    warning: C.warning,
    warningSoft: C.warningSoft,
    error: C.error,
    errorSoft: C.errorSoft,
    info: C.info,
    infoSoft: C.infoSoft,
    star: C.star,
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
} as const;

/** Flat shape, for the screens whose local theme was flat rather than nested. */
export const flatTheme = {
  primary: HS.accent,
  primaryDark: HS.accentDeep,
  primaryLight: HS.accentSoft,
  background: C.bg,
  surface: C.surface,
  text: C.ink,
  textSecondary: C.inkMuted,
  textTertiary: C.inkFaint,
  border: C.line,
  error: C.error,
} as const;

export default theme;
