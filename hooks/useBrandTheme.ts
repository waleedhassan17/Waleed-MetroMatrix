// ============================================
// useBrandTheme — Dynamic Brand Theming Hook
// ============================================
//
// Reads the selected brand from brandStoreSlice and
// returns a theme object driven by the brand's colors.
// Falls back to the app default orange theme.

import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';

// ── Default App Theme (when no brand is selected) ──
const DEFAULT_THEME = {
  primaryColor: '#E67E22',
  secondaryColor: '#D35400',
  accentColor: '#F39C12',
} as const;

// ── Contrast Helpers ────────────────────────

/**
 * Parse a hex colour string to { r, g, b }.
 * Supports both #RGB and #RRGGBB formats.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '');

  // Expand shorthand (#FFF → #FFFFFF)
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/**
 * Relative luminance (WCAG 2.0 formula).
 * Returns a value between 0 (darkest) and 1 (lightest).
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determine whether white or black text should sit on
 * top of the given background colour.
 *
 * Uses a luminance threshold of 0.179 (WCAG AA contrast ≥ 4.5:1).
 */
function textOnBackground(bgHex: string): '#FFFFFF' | '#000000' {
  return relativeLuminance(bgHex) > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * A colour is considered "dark" if its luminance is below 0.4.
 * This enables switching to dark-mode variants of assets inside
 * brand store screens when the primary colour is very dark.
 */
function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.4;
}

// ── Hook Return Type ────────────────────────

export interface BrandTheme {
  /** Brand primary colour or app default orange */
  primaryColor: string;
  /** Brand secondary colour or darker orange */
  secondaryColor: string;
  /** Brand accent colour or golden amber */
  accentColor: string;
  /** White or black – whichever has the best contrast on primaryColor */
  textOnPrimary: '#FFFFFF' | '#000000';
  /** True when the primary colour is dark – toggle dark-mode assets */
  isDark: boolean;
  /** Brand name or null when using default theme */
  brandName: string | null;
  /** Brand logo URL or null */
  brandLogo: string | null;
}

// ── Hook ────────────────────────────────────

/**
 * `useBrandTheme`
 *
 * Use inside any component that is rendered within a Brand Store
 * context.  When a brand is selected in the `brandStore` slice the
 * hook returns colours derived from `BrandConfig`; otherwise it
 * falls back to the default orange theme.
 *
 * ```tsx
 * const { primaryColor, textOnPrimary, isDark } = useBrandTheme();
 * ```
 */
export function useBrandTheme(): BrandTheme {
  const brand = useAppSelector((state) => state.brandStore.brand);

  return useMemo<BrandTheme>(() => {
    const primary = brand?.primaryColor ?? DEFAULT_THEME.primaryColor;
    const secondary = brand?.secondaryColor ?? DEFAULT_THEME.secondaryColor;
    const accent = brand?.accentColor ?? DEFAULT_THEME.accentColor;

    return {
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      textOnPrimary: textOnBackground(primary),
      isDark: isDarkColor(primary),
      brandName: brand?.name ?? null,
      brandLogo: brand?.logo ?? null,
    };
  }, [
    brand?.primaryColor,
    brand?.secondaryColor,
    brand?.accentColor,
    brand?.name,
    brand?.logo,
  ]);
}

export default useBrandTheme;
