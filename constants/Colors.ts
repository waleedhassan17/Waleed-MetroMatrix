// MetroMatrix Professional Color System
// A comprehensive color palette for the Home Services App
//
// ── DARK MODE ───────────────────────────────────────────────────────────────
//
// This is the app's most-imported palette (92 files), and every one of them
// reads it at MODULE SCOPE inside a frozen StyleSheet. So rather than rewrite
// ~1,200 `Colors.x` references, the palette became a FUNCTION of the mode:
// `makeColors(mode)` returns this exact shape with these exact keys.
//
//   const { mode } = useTheme();
//   const Colors = useMemo(() => makeColors(mode), [mode]);
//   const styles = useMemo(() => makeStyles(Colors), [Colors]);
//
// `Colors` stays exported as the LIGHT instance and is byte-identical to what
// it has always been — every literal below is untouched — so a file that has
// not been migrated compiles and renders exactly as before.
//
// HOW THE DARK VALUES WERE CHOSEN
// -------------------------------
// Structure (grounds, text, borders) comes from the dark ramp, because that is
// the whole point. Hues (brand, status, category) are DERIVED from the light
// literals with `lift()` — raised just far enough to clear AA on a dark card —
// rather than hand-picked, so the emerald stays recognisably this app's emerald
// and a new colour added below cannot be forgotten. `*Light` grounds are mixed
// from their own hue, so each pair still reads as one family.
//
// Category hues keep their identity: they are what lets someone find "medical"
// by its blue among six cards, and flattening them would remove the only thing
// telling those cards apart.

import { AA_BODY, lift, mix } from '../theme/contrast';
import { DARK_C, type ThemeMode } from './theme';

export const Colors = {
  // Primary Brand Colors
  primary: '#10B981',        // Emerald green - main brand color
  primaryDark: '#059669',    // Darker emerald for pressed states
  primaryLight: '#D1FAE5',   // Light emerald for backgrounds
  primaryMuted: '#ECFDF5',   // Very light emerald for subtle backgrounds
  
  // Secondary Colors
  secondary: '#8B5CF6',      // Purple for accents
  secondaryDark: '#7C3AED',
  secondaryLight: '#EDE9FE',
  
  // Accent Colors
  accent: '#F59E0B',         // Amber for highlights
  accentDark: '#D97706',
  accentLight: '#FEF3C7',
  
  // Background Colors
  background: '#F8FAFC',     // Main app background
  backgroundAlt: '#F1F5F9',  // Alternative background
  surface: '#FFFFFF',        // Card/surface background
  surfaceElevated: '#FFFFFF',
  
  // Text Colors
  text: {
    primary: '#1F2937',      // Main text
    secondary: '#6B7280',    // Secondary text
    tertiary: '#9CA3AF',     // Muted text
    light: '#D1D5DB',        // Very light text
    inverse: '#FFFFFF',      // Text on dark backgrounds
    brand: '#10B981',        // Brand colored text
  },
  
  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  borderBrand: '#10B981',
  
  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#DC2626',
  
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  
  // Shadow Color
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
  shadowBrand: 'rgba(16, 185, 129, 0.3)',
  
  // Category Colors (for service cards)
  categories: {
    retail: {
      primary: '#10B981',
      light: '#D1FAE5',
      badge: '#059669',
    },
    medical: {
      primary: '#2A7FFF',
      light: '#D6E8FF',
      badge: '#1E6AE1',
    },
    maintenance: {
      primary: '#F59E0B',
      light: '#FEF3C7',
      badge: '#D97706',
    },
    electrical: {
      primary: '#EAB308',
      light: '#FEF9C3',
      badge: '#CA8A04',
    },
    plumbing: {
      primary: '#06B6D4',
      light: '#CFFAFE',
      badge: '#0891B2',
    },
    cleaning: {
      primary: '#8B5CF6',
      light: '#EDE9FE',
      badge: '#7C3AED',
    },
  },
  
  // Gradient Definitions
  gradients: {
    primary: ['#10B981', '#059669'],
    secondary: ['#8B5CF6', '#7C3AED'],
    accent: ['#F59E0B', '#D97706'],
    dark: ['rgba(0, 0, 0, 0.7)', 'transparent'],
    cardOverlay: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.1)'],
    header: ['#FFFFFF', '#F8FAFC'],
  },
} as const;

// Spacing System (8px base)
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

// Border Radius System
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
  full: 9999, // alias for round
} as const;

// Shadow Presets
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    shadowColor: Colors.shadowBrand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  // Shorthand aliases
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ── The dark instance ───────────────────────────────────────────────────────

/** Raise a light-tuned hue until it reads on a dark card, keeping its identity. */
const onDark = (hex: string) => lift(hex, AA_BODY, DARK_C.surface);
/** A tinted ground built from the hue itself, replacing a near-white `*Light`. */
const groundFor = (hex: string) => mix(DARK_C.surface, hex, 0.16);

const DARK: ColorType = {
  primary: onDark(Colors.primary),
  primaryDark: onDark(Colors.primaryDark),
  primaryLight: groundFor(Colors.primary),
  primaryMuted: groundFor(Colors.primary),

  secondary: onDark(Colors.secondary),
  secondaryDark: onDark(Colors.secondaryDark),
  secondaryLight: groundFor(Colors.secondary),

  accent: onDark(Colors.accent),
  accentDark: onDark(Colors.accentDark),
  accentLight: groundFor(Colors.accent),

  background: DARK_C.bg,
  backgroundAlt: DARK_C.surfaceSunken,
  surface: DARK_C.surface,
  // Light has no elevation step (both are #FFFFFF) because a shadow does the
  // lifting there. On dark a shadow is invisible, so the tone has to.
  surfaceElevated: DARK_C.surfaceRaised,

  text: {
    primary: DARK_C.ink,
    secondary: DARK_C.inkMuted,
    tertiary: DARK_C.inkFaint,
    light: DARK_C.disabled,
    inverse: DARK_C.inkInverse,
    brand: onDark(Colors.text.brand),
  },

  border: DARK_C.line,
  borderLight: DARK_C.lineSoft,
  borderDark: DARK_C.disabled,
  borderBrand: onDark(Colors.borderBrand),

  success: DARK_C.success,
  successLight: DARK_C.successSoft,
  successDark: DARK_C.success,

  warning: DARK_C.warning,
  warningLight: DARK_C.warningSoft,
  warningDark: DARK_C.warning,

  error: DARK_C.error,
  errorLight: DARK_C.errorSoft,
  errorDark: DARK_C.error,

  info: DARK_C.info,
  infoLight: DARK_C.infoSoft,
  infoDark: DARK_C.info,

  // A scrim over a dark app has to go further than one over a light app, or
  // the sheet underneath stays legible straight through the overlay.
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(0, 0, 0, 0.45)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',

  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowDark: 'rgba(0, 0, 0, 0.55)',
  shadowBrand: 'rgba(0, 0, 0, 0.4)',

  categories: {
    retail: {
      primary: onDark(Colors.categories.retail.primary),
      light: groundFor(Colors.categories.retail.primary),
      badge: onDark(Colors.categories.retail.badge),
    },
    medical: {
      primary: onDark(Colors.categories.medical.primary),
      light: groundFor(Colors.categories.medical.primary),
      badge: onDark(Colors.categories.medical.badge),
    },
    maintenance: {
      primary: onDark(Colors.categories.maintenance.primary),
      light: groundFor(Colors.categories.maintenance.primary),
      badge: onDark(Colors.categories.maintenance.badge),
    },
    electrical: {
      primary: onDark(Colors.categories.electrical.primary),
      light: groundFor(Colors.categories.electrical.primary),
      badge: onDark(Colors.categories.electrical.badge),
    },
    plumbing: {
      primary: onDark(Colors.categories.plumbing.primary),
      light: groundFor(Colors.categories.plumbing.primary),
      badge: onDark(Colors.categories.plumbing.badge),
    },
    cleaning: {
      primary: onDark(Colors.categories.cleaning.primary),
      light: groundFor(Colors.categories.cleaning.primary),
      badge: onDark(Colors.categories.cleaning.badge),
    },
  },

  gradients: {
    // Gradients go the other way in dark: DOWN from the hue rather than up,
    // because a bright ramp on a dark page is a lamp, not a surface.
    primary: [mix(DARK_C.surface, Colors.primary, 0.55), mix(DARK_C.surface, Colors.primaryDark, 0.45)],
    secondary: [mix(DARK_C.surface, Colors.secondary, 0.55), mix(DARK_C.surface, Colors.secondaryDark, 0.45)],
    accent: [mix(DARK_C.surface, Colors.accent, 0.55), mix(DARK_C.surface, Colors.accentDark, 0.45)],
    dark: ['rgba(0, 0, 0, 0.7)', 'transparent'],
    cardOverlay: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.1)'],
    // White-to-off-white is a light-mode idea; on dark it paints a pale band
    // across the top of the page.
    header: [DARK_C.surface, DARK_C.bg],
  },
};

/**
 * The palette for a mode. Same keys, same shape, either way.
 *
 * Call it in a component and feed the result to a `makeStyles` factory — see
 * the note at the top of this file.
 */
export const makeColors = (mode: ThemeMode): ColorType => (mode === 'dark' ? DARK : Colors);

// Export Gradients as a standalone export for convenience
export const Gradients = Colors.gradients;

export type ColorType = {
  -readonly [K in keyof typeof Colors]: typeof Colors[K] extends object
    ? { -readonly [P in keyof typeof Colors[K]]: any }
    : string;
};
export type SpacingType = typeof Spacing;
export type BorderRadiusType = typeof BorderRadius;
export type ShadowsType = typeof Shadows;