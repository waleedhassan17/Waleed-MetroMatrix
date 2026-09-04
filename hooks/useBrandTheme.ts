// ============================================
// Shopping Module - Dynamic Brand Theming Hook
// ============================================
//
// Returns brand-specific colors when inside a brand store.
// Falls back to app default colors when no brand is selected.
//
// This is the narrow, imperative form: it hands back four values for a screen
// to place by hand. For anything that should recolour SHARED components, wrap
// the subtree in `<ThemeProvider brand={brand}>` from `theme/` instead — that
// is what makes a brand's colours reach a component nobody wrote for them.

import { useMemo } from 'react';
import { textOn } from '../theme/contrast';
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
 *
 * Delegates to `theme/contrast`. The version that used to live here claimed to
 * be the WCAG formula but was YIQ perceived brightness with no gamma
 * expansion, and returned white for any input that was not exactly six hex
 * digits — so a three-digit hex produced white-on-white.
 */
export const getTextOnColor = (hex: string): string => textOn(hex);

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
      textOnPrimary: textOn(brand.primaryColor),
    };
  }, [brand?.primaryColor, brand?.secondaryColor, brand?.accentColor]);
};

export { DEFAULT_THEME as SHOPPING_DEFAULT_THEME };
export default useBrandTheme;
