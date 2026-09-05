// ============================================================================
// Theme — the one import for colour, type and spacing.
//
//   import { useTheme } from '../../theme';
//   const { colors, type, spacing, radius } = useTheme();
//
// COLOUR NOW COMES FROM THE HOOK. ALL OF IT.
// ------------------------------------------
// This used to say that only the accent had to come through `useTheme()`,
// because only the accent changed — so a module-scope StyleSheet could import
// `C` and be done. Dark mode ends that: the neutrals change too, and a sheet
// built at import time is frozen against whichever ramp was loaded first.
//
// `C` is still exported, and still correct for anything that is genuinely
// mode-independent (type scale, spacing, radius, a light-only surface such as
// a printed receipt). For everything else the shape is:
//
//   const makeStyles = (c: ThemeColors) => StyleSheet.create({ … c.surface … });
//   const { colors } = useTheme();
//   const styles = useMemo(() => makeStyles(colors), [colors]);
//
// If a screen still reads `C.bg` inside a StyleSheet, it will render a white
// card on a dark page. That is the single failure mode of this migration.
// ============================================================================

export { C, DARK_C, E, F, GUTTER, PROSE_WIDTH, R, ramp, S, SECTION, T } from '../constants/theme';
export type { Ramp, ThemeMode, Tone } from '../constants/theme';

export {
  AA_BODY,
  AA_LARGE,
  contrastRatio,
  isHexColor,
  lift,
  mix,
  parseHex,
  relativeLuminance,
  textOn,
  tint,
} from './contrast';

export { brandPalette, modulePalette, MODULE_PALETTES, MODULE_PALETTES_DARK } from './palettes';
export type { ModuleName, ModulePalette } from './palettes';

export { useResolvedMode } from './mode';

export { ThemeProvider, useTheme } from './ThemeProvider';
export type { BrandColors, Theme, ThemeColors, ThemeProviderProps } from './ThemeProvider';
export { default } from './ThemeProvider';
