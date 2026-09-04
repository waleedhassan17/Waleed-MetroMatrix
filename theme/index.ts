// ============================================================================
// Theme — the one import for colour, type and spacing.
//
//   import { useTheme } from '../../theme';
//   const { colors, type, spacing, radius } = useTheme();
//
// Base tokens are re-exported so a StyleSheet defined at module scope (which
// cannot call a hook) can still use the neutrals, type scale and spacing —
// only the ACCENT needs to come through `useTheme()`, because only the accent
// changes per module and per brand.
// ============================================================================

export { C, E, F, GUTTER, PROSE_WIDTH, R, S, SECTION, T } from '../constants/theme';
export type { Tone } from '../constants/theme';

export {
  AA_BODY,
  AA_LARGE,
  contrastRatio,
  isHexColor,
  parseHex,
  relativeLuminance,
  textOn,
  tint,
} from './contrast';

export { brandPalette, MODULE_PALETTES } from './palettes';
export type { ModuleName, ModulePalette } from './palettes';

export { ThemeProvider, useTheme } from './ThemeProvider';
export type { BrandColors, Theme, ThemeProviderProps } from './ThemeProvider';
export { default } from './ThemeProvider';
