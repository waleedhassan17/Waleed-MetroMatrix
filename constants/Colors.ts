// MetroMatrix Professional Color System
// A comprehensive color palette for the Home Services App

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

// Export Gradients as a standalone export for convenience
export const Gradients = Colors.gradients;

export type ColorType = typeof Colors;
export type SpacingType = typeof Spacing;
export type BorderRadiusType = typeof BorderRadius;
export type ShadowsType = typeof Shadows;