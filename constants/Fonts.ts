// ============================================================================
// MetroMatrix — Typography (Material-shaped scale)
//
// This is the OLDER of the two type systems. `constants/theme.ts` exports `T`,
// a shorter 9-role scale, and that is what new work should use. This file
// survives because ~48 call sites across healthcare and the auth flow spread
// `Typography.*` into their styles, and rewriting those screens is a separate
// pass. Both files now resolve to the same loaded faces, so the two systems
// no longer render in different fonts.
//
// WHAT CHANGED
// ------------
// Every family slot below used to be the literal string 'System'. The app
// referenced 'Inter-Regular' / 'Inter-SemiBold' etc. in 98 places while loading
// no font at all, so every one of those silently fell back to San Francisco or
// Roboto. Inter and Sora are now really loaded (App.tsx) and the names here are
// the faces `useFonts` registers.
//
// NO ENTRY BELOW SETS `fontWeight` — see the note on `F` in theme.ts. With a
// named face, Android synthesises a second bold on top of the real one. Weight
// is chosen by picking a family.
// ============================================================================

import { F } from './theme';

export const Fonts = {
  regular: F.regular,
  medium: F.medium,
  semiBold: F.semibold,
  bold: F.bold,

  /** Large headings only. Sora has no regular weight loaded. */
  display: F.displayBold,
  displaySemiBold: F.displaySemibold,

  mono: F.mono,
} as const;

// Typography Scale - Complete Text Styles
export const Typography = {
  // Display Styles (Large headers)
  display: {
    large: {
      fontFamily: Fonts.display,
      fontSize: 34,
      lineHeight: 42,
      letterSpacing: -0.5,
    },
    medium: {
      fontFamily: Fonts.display,
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    small: {
      fontFamily: Fonts.display,
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
  },

  // Headline Styles
  headline: {
    large: {
      fontFamily: Fonts.displaySemiBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: Fonts.displaySemiBold,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: 0,
    },
    small: {
      fontFamily: Fonts.displaySemiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
    },
  },

  // Title Styles
  title: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
    },
    small: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
  },

  // Body Styles
  body: {
    large: {
      fontFamily: Fonts.regular,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    medium: {
      fontFamily: Fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    small: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.1,
    },
  },

  // Label Styles
  label: {
    large: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    medium: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
    small: {
      fontFamily: Fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
  },

  // Caption Styles
  caption: {
    large: {
      fontFamily: Fonts.regular,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
    medium: {
      fontFamily: Fonts.regular,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
    small: {
      fontFamily: Fonts.regular,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
    },
  },

  // Button Styles
  button: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.3,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.3,
    },
    small: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
  },

  // Badge/Tag Styles
  badge: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    small: {
      fontFamily: Fonts.semiBold,
      fontSize: 9,
      lineHeight: 12,
      letterSpacing: 0.7,
      textTransform: 'uppercase' as const,
    },
  },

  // Tab Bar Styles
  tab: {
    active: {
      fontFamily: Fonts.bold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    inactive: {
      fontFamily: Fonts.medium,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
  },

  /** Reference codes and transaction ids. */
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },

  // Flat aliases for convenience (e.g., Typography.displaySmall instead of Typography.display.small)
  displayLarge: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  headlineLarge: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  titleSmall: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  overline: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export type FontsType = typeof Fonts;
export type TypographyType = typeof Typography;
