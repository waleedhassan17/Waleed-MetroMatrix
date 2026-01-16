// MetroMatrix Professional Typography System
import { Platform } from 'react-native';

// Font Family Definitions - Using System font for consistency across platforms
const fontFamilies = {
  ios: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
};

const getCurrentFontFamily = () => {
  return Platform.select({
    ios: fontFamilies.ios,
    android: fontFamilies.android,
    default: fontFamilies.default,
  }) || fontFamilies.default;
};

const currentFonts = getCurrentFontFamily();

export const Fonts = {
  // Font Families
  regular: currentFonts.regular,
  medium: currentFonts.medium,
  semiBold: currentFonts.semiBold,
  bold: currentFonts.bold,
  
  // Font Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
} as const;

// Typography Scale - Complete Text Styles
export const Typography = {
  // Display Styles (Large headers)
  display: {
    large: {
      fontFamily: Fonts.bold,
      fontSize: 34,
      lineHeight: 42,
      fontWeight: Fonts.weights.bold,
      letterSpacing: -0.5,
    },
    medium: {
      fontFamily: Fonts.bold,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: Fonts.weights.bold,
      letterSpacing: -0.3,
    },
    small: {
      fontFamily: Fonts.bold,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: Fonts.weights.bold,
      letterSpacing: -0.2,
    },
  },
  
  // Headline Styles
  headline: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0,
    },
    small: {
      fontFamily: Fonts.semiBold,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0,
    },
  },
  
  // Title Styles
  title: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0,
    },
    small: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: Fonts.weights.medium,
      letterSpacing: 0,
    },
  },
  
  // Body Styles
  body: {
    large: {
      fontFamily: Fonts.regular,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: Fonts.weights.regular,
      letterSpacing: 0.15,
    },
    medium: {
      fontFamily: Fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: Fonts.weights.regular,
      letterSpacing: 0.1,
    },
    small: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: Fonts.weights.regular,
      letterSpacing: 0.1,
    },
  },
  
  // Label Styles
  label: {
    large: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: Fonts.weights.medium,
      letterSpacing: 0.1,
    },
    medium: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: Fonts.weights.medium,
      letterSpacing: 0.2,
    },
    small: {
      fontFamily: Fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: Fonts.weights.medium,
      letterSpacing: 0.3,
    },
  },
  
  // Caption Styles
  caption: {
    large: {
      fontFamily: Fonts.regular,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: Fonts.weights.regular,
      letterSpacing: 0.2,
    },
    medium: {
      fontFamily: Fonts.regular,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: Fonts.weights.regular,
      letterSpacing: 0.3,
    },
    small: {
      fontFamily: Fonts.regular,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: Fonts.weights.regular,
      letterSpacing: 0.4,
    },
  },
  
  // Button Styles
  button: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0.3,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0.3,
    },
    small: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: Fonts.weights.medium,
      letterSpacing: 0.4,
    },
  },
  
  // Badge/Tag Styles
  badge: {
    large: {
      fontFamily: Fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    medium: {
      fontFamily: Fonts.semiBold,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: Fonts.weights.semiBold,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    small: {
      fontFamily: Fonts.semiBold,
      fontSize: 9,
      lineHeight: 12,
      fontWeight: Fonts.weights.semiBold,
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
      fontWeight: Fonts.weights.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    inactive: {
      fontFamily: Fonts.medium,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: Fonts.weights.medium,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
  },
  
  // Flat aliases for convenience (e.g., Typography.displaySmall instead of Typography.display.small)
  displayLarge: {
    fontFamily: Fonts.bold,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: Fonts.weights.bold,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: Fonts.weights.bold,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: Fonts.weights.bold,
    letterSpacing: -0.2,
  },
  headlineLarge: {
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: Fonts.weights.semiBold,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: Fonts.weights.semiBold,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Fonts.weights.semiBold,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Fonts.weights.semiBold,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: Fonts.weights.semiBold,
    letterSpacing: 0,
  },
  titleSmall: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Fonts.weights.medium,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Fonts.weights.regular,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Fonts.weights.regular,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: Fonts.weights.regular,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Fonts.weights.medium,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Fonts.weights.medium,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: Fonts.weights.medium,
    letterSpacing: 0.3,
  },
  overline: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: Fonts.weights.medium,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export type FontsType = typeof Fonts;
export type TypographyType = typeof Typography;