// ============================================================================
// ThemeProvider / useTheme
//
// Resolves base + module + brand into one object and hands it down. Providers
// nest: the root sets `neutral`, a stack sets its module, and a brand subtree
// overrides the accent on top of whatever it inherits.
//
//   <ThemeProvider module="shopping">          // orange
//     <ThemeProvider brand={myBrand}>          // that brand's colours
//       <BrandTabs />                          // shared components recolour
//
// A screen reads `useTheme().colors.accent` and never imports HC / HS / B
// directly. That indirection is the only reason a brand can restyle screens
// nobody wrote for them.
//
// WHAT THIS IS NOT
// ----------------
// It is not a migration mandate. Every screen that still imports a palette
// directly keeps working exactly as before — this sits alongside them. The
// intent is that new work and touched screens read from here, so the direct
// imports drain over time rather than in one unreviewable diff.
// ============================================================================

import React, { createContext, useContext, useMemo } from 'react';

import {
  C,
  E,
  F,
  GUTTER,
  PROSE_WIDTH,
  R,
  ramp,
  Ramp,
  S,
  SECTION,
  T,
  ThemeMode,
} from '../constants/theme';
import { textOn } from './contrast';
import { brandPalette, modulePalette, MODULE_PALETTES, ModuleName, ModulePalette } from './palettes';

/**
 * The resolved colour set.
 *
 * Exported because a screen's StyleSheet lives at module scope and cannot call
 * a hook, so brand-aware screens take the shape
 * `const makeStyles = (c: ThemeColors) => StyleSheet.create({ … })` and build
 * it inside the component with `useMemo`.
 */
export type ThemeColors = Ramp & ModulePalette;

export interface Theme {
  /** Neutrals and semantics from the base, plus the active accent set. */
  colors: ThemeColors;
  /** Which neutral ramp `colors` was built from. */
  mode: ThemeMode;
  /** `mode === 'dark'`. Here because reading it is the common case. */
  isDark: boolean;
  type: typeof T;
  families: typeof F;
  spacing: typeof S;
  radius: typeof R;
  elevation: typeof E;
  gutter: number;
  section: number;
  proseWidth: number;

  /** Which vertical is in scope. */
  module: ModuleName;
  /** True when a brand has overridden the module accent below this point. */
  isBranded: boolean;
  /**
   * A brand's third colour: highlights only — a cart badge, a sale flag. Null
   * outside a branded subtree, or when the brand set no accent.
   */
  brandAccent: string | null;
}

const buildTheme = (
  mode: ThemeMode,
  module: ModuleName,
  palette: ModulePalette,
  isBranded: boolean,
  brandAccent: string | null,
): Theme => ({
  colors: { ...ramp(mode), ...palette },
  mode,
  isDark: mode === 'dark',
  type: T,
  families: F,
  spacing: S,
  radius: R,
  elevation: E,
  gutter: GUTTER,
  section: SECTION,
  proseWidth: PROSE_WIDTH,
  module,
  isBranded,
  brandAccent,
});

// Light on purpose: `useTheme()` outside a provider must behave exactly as it
// did before dark mode existed, or an unmigrated screen that happens to mount a
// shared component starts rendering dark chrome on a white page.
const DEFAULT_THEME = buildTheme('light', 'neutral', MODULE_PALETTES.neutral, false, null);

const ThemeContext = createContext<Theme>(DEFAULT_THEME);

/** Minimal shape a brand must present. Matches `BrandConfig` structurally. */
export interface BrandColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Sets the vertical. Omit to inherit the enclosing provider's module. */
  module?: ModuleName;
  /**
   * A brand whose colours override the accent set for this subtree. Passing
   * null, or a brand with no `primaryColor`, leaves the module accent in place
   * — which is how a brand that never picked colours gets the shopping default.
   */
  brand?: BrandColors | null;
  /**
   * Light or dark. Omit to inherit — which is what almost every provider in
   * the tree does, so the mode is set once at the root and a stack naming only
   * its module cannot accidentally revert it.
   *
   * Pass it explicitly to PIN a subtree: that is how routes which have not been
   * migrated to the theme stay light while the rest of the app goes dark.
   */
  mode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  module,
  brand,
  mode,
}) => {
  const parent = useContext(ThemeContext);

  const value = useMemo<Theme>(() => {
    const name = module ?? parent.module;
    const activeMode = mode ?? parent.mode;
    const base = modulePalette(name, activeMode);

    // A brand overrides colours, not layout decisions: whether the app bar is
    // painted at all stays the module's call, so a brand cannot accidentally
    // put its own hex behind a page title.
    const branded = brandPalette(
      brand?.primaryColor,
      brand?.secondaryColor,
      brand?.accentColor,
      base.barTone,
      activeMode,
    );

    // An inherited brand must survive a child provider that only names a
    // module, or dropping into a branded screen's sub-route would silently
    // revert to orange.
    //
    // `activeMode === parent.mode` guards the shortcut: handing back the parent
    // wholesale also hands back its ramp, so without this a provider that pins
    // a mode inside a branded subtree would be silently ignored.
    if (!branded && parent.isBranded && module === undefined && activeMode === parent.mode) {
      return parent;
    }

    return buildTheme(
      activeMode,
      name,
      branded ?? base,
      !!branded,
      branded ? brand?.accentColor || null : null,
    );
  }, [
    module,
    mode,
    brand?.primaryColor,
    brand?.secondaryColor,
    brand?.accentColor,
    parent,
  ]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * The active theme. Safe outside a provider — returns the neutral base rather
 * than throwing, because a shared component may be mounted by a screen that has
 * not been migrated yet.
 */
export const useTheme = (): Theme => useContext(ThemeContext);

/** Readable ink for an arbitrary ground. Re-exported so screens need one import. */
export { textOn };

export default ThemeProvider;
