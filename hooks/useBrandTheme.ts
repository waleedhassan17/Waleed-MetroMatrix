// ============================================
// Shopping Module - Dynamic Brand Theming Hook
// ============================================
//
// Returns brand-specific colors when inside a brand store.
// Falls back to app default colors when no brand is selected.

import { useMemo } from 'react';
import type { BrandConfig, BrandTheme } from '../types/shopping';

// Default Shopping Module colors (Shopping Orange)
const DEFAULT_THEME: BrandTheme = {
  primaryColor: '#E67E22',
  secondaryColor: '#D35400',
  accentColor: '#F39C12',
  textOnPrimary: '#FFFFFF',
};

/**
 * Determines whether white or dark text provides better contrast
 * against the given hex background color.
 */
const getTextOnColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  // Relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
};

/**
 * useBrandTheme
 *
 * @param brand - The currently selected BrandConfig, or null/undefined
 *                when the user is not browsing a specific brand store.
 * @returns A memoized BrandTheme object with primaryColor,
 *          secondaryColor, accentColor, and textOnPrimary.
 *
 * Usage:
 * ```ts
 * const theme = useBrandTheme(selectedBrand);
 * <View style={{ backgroundColor: theme.primaryColor }}>
 *   <Text style={{ color: theme.textOnPrimary }}>Brand Title</Text>
 * </View>
 * ```
 */
export const useBrandTheme = (
  brand?: BrandConfig | null
): BrandTheme => {
  return useMemo<BrandTheme>(() => {
    if (!brand || !brand.primaryColor) {
      return DEFAULT_THEME;
    }

    return {
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor || DEFAULT_THEME.secondaryColor,
      accentColor: brand.accentColor || DEFAULT_THEME.accentColor,
      textOnPrimary: getTextOnColor(brand.primaryColor),
    };
  }, [brand?.primaryColor, brand?.secondaryColor, brand?.accentColor]);
};

export { DEFAULT_THEME as SHOPPING_DEFAULT_THEME };
export default useBrandTheme;
