// ============================================
// Healthcare Module — Unified Design Tokens
// Marham-style clinical blue. Single source of
// truth for the patient (user) healthcare flow.
// Consolidates the per-screen THEME blocks that
// used to be copy-pasted across screens.
// ============================================

import { Platform } from 'react-native';

export const HC = {
  // ── Brand (clinical blue) ──────────────────
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryDarker: '#1857C0',
  primaryLight: '#EAF3FF',
  primarySoft: '#F0F7FF',
  accent: '#5A9FFF',
  accentLight: '#D6E8FF',

  // ── Status ─────────────────────────────────
  success: '#10B981',
  successDark: '#059669',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorDark: '#DC2626',
  errorLight: '#FEF2F2',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',

  // ── Surfaces ───────────────────────────────
  pageBg: '#F8FBFF',
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',

  // ── Text ───────────────────────────────────
  textDark: '#0F172A',
  textHeading: '#0F172A',
  textBody: '#334155',
  textMedium: '#475569',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // ── Lines ──────────────────────────────────
  border: '#E2E8F0',
  borderLight: '#EEF2FF',
  divider: '#F1F5F9',

  // ── Misc ───────────────────────────────────
  star: '#FBBF24',
  overlay: 'rgba(15, 23, 42, 0.45)',

  // ── Gradients ──────────────────────────────
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    accent: ['#5A9FFF', '#2A7FFF'] as [string, string],
    soft: ['#EAF3FF', '#D6E8FF'] as [string, string],
    success: ['#10B981', '#059669'] as [string, string],
    warm: ['#F59E0B', '#EF4444'] as [string, string],
    video: ['#5A9FFF', '#1E6AE1'] as [string, string],
    sky: ['#1E6AE1', '#2A7FFF', '#5A9FFF'] as [string, string, string],
  },
} as const;

// ── Spacing scale ────────────────────────────
export const HCSpace = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

// ── Radius scale ─────────────────────────────
export const HCRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

// ── Elevation presets (platform-aware) ───────
const elev = (
  height: number,
  radius: number,
  opacity: number,
  color = '#1E293B',
  androidElevation = Math.round(height + 1)
) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation: androidElevation },
    default: {},
  }) as object;

export const HCShadow = {
  none: Platform.select({ android: { elevation: 0 }, default: {} }) as object,
  xs: elev(2, 8, 0.06),
  sm: elev(3, 10, 0.08),
  md: elev(6, 14, 0.1),
  lg: elev(10, 20, 0.14),
  brand: elev(8, 16, 0.25, '#2A7FFF'),
  success: elev(8, 16, 0.22, '#10B981'),
} as const;

// ── Status → visual mapping (appointments) ───
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export const STATUS_STYLE: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  pending: { label: 'Pending', color: HC.warningDark, bg: HC.warningLight, icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: HC.primaryDark, bg: HC.primaryLight, icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: HC.successDark, bg: HC.successLight, icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', color: HC.errorDark, bg: HC.errorLight, icon: 'close-circle-outline' },
  'no-show': { label: 'No-show', color: HC.textLight, bg: HC.divider, icon: 'alert-circle-outline' },
};

export const STATUS_BAR_HEIGHT_ANDROID =
  Platform.OS === 'android' ? 24 : 0;
