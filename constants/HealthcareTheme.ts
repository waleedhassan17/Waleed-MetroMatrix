// ============================================================================
// Healthcare Module — Unified Design Tokens
// Marham-style clinical blue. Single source of truth for the patient (user)
// healthcare flow AND, via constants/DoctorTheme.ts, the doctor flow.
// Consolidates the per-screen THEME blocks that used to be copy-pasted.
//
// HOW THIS RELATES TO constants/theme.ts
// --------------------------------------
// The blue is real and stays: it is healthcare's accent, and `theme/palettes.ts`
// lifts it into the `healthcare` module layer.
//
// The NEUTRALS below are a different matter. The base ramp is warm stone
// (#FAFAF9 / #1C1917 / #57534E); the surfaces, text and lines in this file are
// cool slate. Those two should not both exist — see the marked compatibility
// block further down for why they still do, and what deletes it.
// ============================================================================

import { Platform } from 'react-native';

import { tint } from '../theme/contrast';
import { darkShift } from './darkShift';
import { type ThemeMode } from './theme';

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

  // ══ SLATE COMPATIBILITY BLOCK ══════════════
  //
  // TEMPORARY. Everything from here to `divider` is a cool-slate neutral ramp
  // that duplicates — and disagrees with — the warm stone ramp in
  // constants/theme.ts (`C`). One app, one grey story; this is the exception.
  //
  // WHY IT SURVIVES
  // Healthcare SCREENS do not import HC at all. All 21 of them declare their
  // own local `const THEME = { … }` full of these same slate hexes. Only the
  // 11 files under components/Healthcare/** read HC. So flipping these keys to
  // `C` today would turn the shared healthcare components warm while the screen
  // bodies wrapping them stayed cool — a visible seam down the middle of every
  // screen, which is worse than either end state.
  //
  // WHAT DELETES IT
  // Migrating the healthcare screens off their local THEME blocks onto
  // `useTheme()`. On the day the last one lands, delete this block and the
  // neutrals resolve from `C` — the module keeps its blue and gains the shared
  // ramp. Nothing else has to change.
  //
  // Until then: do not add keys here, and do not copy these hexes into a screen.

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
  // ══ END SLATE COMPATIBILITY BLOCK ══════════

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


// ── Mode-aware HC ───────────────────────────────────────────────────────────
//
// `HC` above stays exactly as it was and remains the LIGHT palette, so every
// unmigrated file compiles and renders identically. `makeHC(mode)` returns the
// same keys with dark derived by role — see constants/darkShift.ts for why the
// dark values are computed rather than hand-picked.
//
// Note what happens to the SLATE COMPATIBILITY BLOCK in dark: its cool-slate
// neutrals resolve from the shared ramp (`n(...)`), so in dark there is only
// one grey story already. The light half is what still waits on the screens.
export const makeHC = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);

  return {
    primary: hue(HC.primary),
    primaryDark: hue(HC.primaryDark),
    primaryDarker: hue(HC.primaryDarker),
    primaryLight: ground(HC.primaryLight, HC.primary),
    primarySoft: ground(HC.primarySoft, HC.primary),
    accent: hue(HC.accent),
    accentLight: ground(HC.accentLight, HC.accent),

    success: hue(HC.success),
    successDark: hue(HC.successDark),
    successLight: ground(HC.successLight, HC.success),
    warning: hue(HC.warning),
    warningDark: hue(HC.warningDark),
    warningLight: ground(HC.warningLight, HC.warning),
    error: hue(HC.error),
    errorDark: hue(HC.errorDark),
    errorLight: ground(HC.errorLight, HC.error),
    info: hue(HC.info),
    infoLight: ground(HC.infoLight, HC.info),

    pageBg: n(HC.pageBg, 'bg'),
    card: n(HC.card, 'surface'),
    cardAlt: n(HC.cardAlt, 'surfaceSunken'),

    textDark: n(HC.textDark, 'ink'),
    textHeading: n(HC.textHeading, 'ink'),
    textBody: n(HC.textBody, 'ink'),
    textMedium: n(HC.textMedium, 'inkMuted'),
    textLight: n(HC.textLight, 'inkMuted'),
    textMuted: n(HC.textMuted, 'inkFaint'),
    // Ink painted ON the clinical blue. Still white: the dark blue fill is a
    // lifted mid-tone, not a pale one.
    textInverse: HC.textInverse,

    border: n(HC.border, 'line'),
    borderLight: n(HC.borderLight, 'lineSoft'),
    divider: n(HC.divider, 'lineSoft'),

    star: hue(HC.star),
    overlay: mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : HC.overlay,

    gradient: {
      primary: grad(HC.gradient.primary),
      accent: grad(HC.gradient.accent),
      soft: mode === 'dark'
        ? ([ground(HC.primaryLight, HC.primary), ground(HC.accentLight, HC.accent)] as [string, string])
        : HC.gradient.soft,
      success: grad(HC.gradient.success),
      warm: grad(HC.gradient.warm),
      video: grad(HC.gradient.video),
      sky: (mode === 'dark'
        ? [hue(HC.primaryDark), hue(HC.primary), hue(HC.accent)]
        : HC.gradient.sky) as [string, string, string],
    },
  };
};

export type HCPalette = ReturnType<typeof makeHC>;

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

// ── Health home (the patient's landing page) ─────────────────────────────────
//
// The photo-led home: a bento of soft cards whose photos fade into their own
// ground, photo tiles, staff banners, a specialty grid in categorical colours,
// and the city's top doctors on deep-blue cards. Raw values live here (this
// file is the token source the design gates exempt); the components under
// components/Healthcare/home read them and nothing else.

export const HC_HOME = {
  /** Bento: the tall card equals two short ones and the gap between them. */
  careTall: 268,
  careShort: 128,
  photoTileWidth: 112,
  photoTileImage: 84,
  spotlightWidth: 272,
  railCardWidth: 280,
  /** A specialty or concern's round icon well. */
  well: 52,
  /** The arrow disc on a care card. */
  arrowWell: 32,
  /** The white ring round a portrait on a blue card. */
  portraitRing: 2,
  bannerAspect: 2,
  pageDot: 8,
  pageDotActive: 24,
  touch: 48,
  /** Banners advance this often, and hold still while touched. */
  bannerInterval: 6000,
  imageFade: 150,
  /** A video visit opens this long before it starts. */
  joinEarlyMinutes: 15,
} as const;

/**
 * Type for the home's own roles. Section heads are the FYP's 19/800, the same
 * weight as the header, so the page reads as one design; the rest follow the
 * healthcare screens' sizes.
 */
export const HC_TYPE = {
  sectionTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 },
  bannerTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  chip: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  link: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
} as const;

/** Words and wells painted on the deep-blue cards (the same in both modes). */
export const HC_ON_BLUE = {
  ink: '#FFFFFF',
  soft: 'rgba(255, 255, 255, 0.82)',
  tint: 'rgba(255, 255, 255, 0.18)',
  /** The top doctors' cards, and the next visit's. White text clears AA on both. */
  spotlight: '#1857C0',
  nextVisit: '#1E6AE1',
  /** Photo scrims under white banner copy. */
  scrimFaint: 'rgba(15, 23, 42, 0.05)',
  scrimMid: 'rgba(15, 23, 42, 0.35)',
  scrimDeep: 'rgba(15, 23, 42, 0.78)',
} as const;

export type CareTint = 'video' | 'clinic' | 'today';

const CARE_TINTS: Record<CareTint, { bg: string; fg: string }> = {
  video: { bg: '#E6F0FF', fg: '#1857C0' },
  clinic: { bg: '#FDEEE6', fg: '#9A3412' },
  today: { bg: '#E3F6EE', fg: '#047857' },
};

/**
 * The bento's soft grounds. `fade` is the ground at zero opacity, for the
 * scrim that runs the ground into the photo. Dark mode derives each ground
 * from the dark surface, like every other tinted well here.
 */
export const makeCareTints = (mode: ThemeMode): Record<CareTint, { bg: string; fade: string; fg: string }> => {
  const { hue, ground } = darkShift(mode);
  const out = {} as Record<CareTint, { bg: string; fade: string; fg: string }>;
  (Object.keys(CARE_TINTS) as CareTint[]).forEach((k) => {
    const bg = ground(CARE_TINTS[k].bg, CARE_TINTS[k].fg);
    out[k] = { bg, fade: tint(bg, 0), fg: hue(CARE_TINTS[k].fg) };
  });
  return out;
};

/**
 * Specialty wells: a categorical colour per tile (cycled), so a grid of eight
 * reads as eight things at a glance. Each glyph clears 3:1 on its ground.
 */
const SPECIALTY_TINTS: { fg: string; bg: string }[] = [
  { fg: '#1857C0', bg: '#E6F0FF' },
  { fg: '#BE185D', bg: '#FCE7F3' },
  { fg: '#7C3AED', bg: '#EDE9FE' },
  { fg: '#B45309', bg: '#FEF3C7' },
  { fg: '#B91C1C', bg: '#FEE2E2' },
  { fg: '#047857', bg: '#D1FAE5' },
  { fg: '#0E7490', bg: '#CFFAFE' },
  { fg: '#4338CA', bg: '#E0E7FF' },
];

export const makeSpecialtyTints = (mode: ThemeMode): { fg: string; bg: string }[] => {
  const { hue, ground } = darkShift(mode);
  return SPECIALTY_TINTS.map((t) => ({ fg: hue(t.fg), bg: ground(t.bg, t.fg) }));
};
