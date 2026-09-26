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
// Roboto. That fallback is now the deliberate choice app-wide: no custom face
// is loaded, and these names carry weight rather than a family.
//
// WEIGHT IS `fontWeight` HERE NOW — see the note on `W` in theme.ts. The app
// renders in the platform system face and loads no custom family, so there is
// no 600 or 700 family name to point at; weight has to be stated directly.
// ============================================================================

import { F, W } from './theme';

export const Fonts = {
  regular: W.regular,
  medium: W.medium,
  semiBold: W.semibold,
  bold: W.bold,

  /** Large headings. Now the same system face as everything else, kept as a
   *  distinct name only so the legacy scale below still reads. */
  display: W.displayBold,
  displaySemiBold: W.displaySemibold,

  /** The one real family left. */
  mono: F.mono,
} as const;

// Typography Scale - Complete Text Styles
export const Typography = {
  // Display Styles (Large headers)
  display: {
    large: {
      fontWeight: Fonts.display,
      fontSize: 34,
      lineHeight: 42,
      letterSpacing: -0.5,
    },
    medium: {
      fontWeight: Fonts.display,
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    small: {
      fontWeight: Fonts.display,
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
  },

  // Headline Styles
  headline: {
    large: {
      fontWeight: Fonts.displaySemiBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: 0,
    },
    medium: {
      fontWeight: Fonts.displaySemiBold,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: 0,
    },
    small: {
      fontWeight: Fonts.displaySemiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
    },
  },

  // Title Styles
  title: {
    large: {
      fontWeight: Fonts.semiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
    },
    medium: {
      fontWeight: Fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
    },
    small: {
      fontWeight: Fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
  },

  // Body Styles
  body: {
    large: {
      fontWeight: Fonts.regular,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    medium: {
      fontWeight: Fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    small: {
      fontWeight: Fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.1,
    },
  },

  // Label Styles
  label: {
    large: {
      fontWeight: Fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    medium: {
      fontWeight: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
    small: {
      fontWeight: Fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
  },

  // Caption Styles
  caption: {
    large: {
      fontWeight: Fonts.regular,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
    },
    medium: {
      fontWeight: Fonts.regular,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
    small: {
      fontWeight: Fonts.regular,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
    },
  },

  // Button Styles
  button: {
    large: {
      fontWeight: Fonts.semiBold,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.3,
    },
    medium: {
      fontWeight: Fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.3,
    },
    small: {
      fontWeight: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
  },

  // Badge/Tag Styles
  badge: {
    large: {
      fontWeight: Fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    medium: {
      fontWeight: Fonts.semiBold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    small: {
      fontWeight: Fonts.semiBold,
      fontSize: 9,
      lineHeight: 12,
      letterSpacing: 0.7,
      textTransform: 'uppercase' as const,
    },
  },

  // Tab Bar Styles
  tab: {
    active: {
      fontWeight: Fonts.bold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    inactive: {
      fontWeight: Fonts.medium,
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
    fontWeight: Fonts.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontWeight: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontWeight: Fonts.display,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  headlineLarge: {
    fontWeight: Fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontWeight: Fonts.displaySemiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontWeight: Fonts.displaySemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleLarge: {
    fontWeight: Fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleMedium: {
    fontWeight: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  titleSmall: {
    fontWeight: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontWeight: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontWeight: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontWeight: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontWeight: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontWeight: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontWeight: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  overline: {
    fontWeight: Fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export type FontsType = typeof Fonts;
export type TypographyType = typeof Typography;
