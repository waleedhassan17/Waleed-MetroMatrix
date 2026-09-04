// ============================================================================
// MetroMatrix — Base design tokens
//
// ONE neutral ramp, ONE type scale, ONE radius scale, THREE elevations.
// Deliberately carries no vertical brand colour: healthcare, shopping and home
// services each layer a small accent on top of this (see HomeServiceTheme.ts).
//
// WHY A WARM STONE RAMP, NOT SLATE
// --------------------------------
// The home-service screens had 355 hardcoded Tailwind-slate hexes (#64748B,
// #1E293B, #94A3B8 …) — the exact default ramp anything reaches for when no
// palette was chosen. Every one of them maps onto a token below:
//
//   #1E293B -> ink        #64748B -> inkMuted   #94A3B8 -> inkFaint
//   #E2E8F0 -> line       #F1F5F9 -> lineSoft   #F8FAFC -> surfaceSunken
//   #CBD5E1 -> disabled
//
// Use the token, never the hex. Three greys used interchangeably for body text
// is what made the old screens read as unedited.
// ============================================================================

import { Platform, TextStyle } from 'react-native';

// ── Neutrals ────────────────────────────────────────────────────────────────
export const C = {
  /** Page canvas. Warm paper — not pure white, not slate-50. */
  bg: '#FAFAF9',
  /** Cards and sheets sitting on `bg`. */
  surface: '#FFFFFF',
  /** Recessed wells: input grounds, segmented-control tracks, thumbnails. */
  surfaceSunken: '#F5F5F4',

  /** The ONE primary text colour. Headings and body both. */
  ink: '#1C1917',
  /** The ONE secondary text colour. Supporting lines, metadata. */
  inkMuted: '#57534E',
  /** Icons, placeholders, disabled labels. Never body copy — it fails contrast. */
  inkFaint: '#A8A29E',
  /** Text on a dark or accent ground. */
  inkInverse: '#FFFFFF',

  /** Hairline borders. */
  line: '#E7E5E4',
  /** Dividers inside a card, where `line` is too loud. */
  lineSoft: '#F5F5F4',
  /** Disabled control fills and rules. */
  disabled: '#D6D3D1',

  // ── Status ────────────────────────────────────────────────────────────────
  success: '#047857',
  successSoft: '#ECFDF5',
  warning: '#B45309',
  warningSoft: '#FEF6EC',
  error: '#B91C1C',
  errorSoft: '#FEF2F2',
  info: '#1D4ED8',
  infoSoft: '#EFF6FF',

  /** Filled rating stars. Amber, and only ever this. */
  star: '#D97706',

  /** Scrim behind sheets and modals. */
  scrim: 'rgba(28, 25, 23, 0.45)',
} as const;

// ── Spacing (4-pt) ──────────────────────────────────────────────────────────
export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/** Horizontal screen padding. Every screen, no exceptions. */
export const GUTTER = 20;
/** Vertical gap between major sections. */
export const SECTION = 24;

// ── Radius (expresses hierarchy — do not use one value everywhere) ──────────
export const R = {
  /** Chips, badges, small tags. */
  chip: 8,
  /** Inputs, buttons, segmented controls. */
  control: 10,
  /** Cards. The default for anything holding content. */
  card: 12,
  /** Bottom sheets and the single hero. Nothing else. */
  sheet: 20,
  pill: 999,
} as const;

// ── Type scale ──────────────────────────────────────────────────────────────
//
// No `overline` / ALL-CAPS eyebrow role exists here on purpose: a stacked
// tiny-caps label above the content it labels is redundant twice over, and it
// was the loudest generated tell on the old screens. If a section needs a name,
// it gets `heading`.
//
// The app loads no custom fonts (expo-font is not a dependency), so weight,
// size and line-height do all the work. That means they have to be deliberate.

const font = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TextStyle['fontWeight'],
  letterSpacing = 0,
): TextStyle => ({ fontSize, lineHeight, fontWeight, letterSpacing });

export const T = {
  /** Screen-owning numbers: earnings totals, a paid amount. Rare. */
  display: font(34, 40, '700', -0.6),
  /** Page title inside content (not the app bar). */
  title: font(26, 32, '700', -0.4),
  /** Section heading. */
  heading: font(20, 26, '600', -0.2),
  /** Card title, app-bar title, list-row primary line. */
  subhead: font(16, 22, '600'),
  /** Body copy and most values. */
  body: font(14, 20, '400'),
  /** Body weight-shifted for emphasis — prices, selected values. */
  bodyStrong: font(14, 20, '600'),
  /** Control labels, chips, buttons. */
  label: font(13, 16, '500'),
  /** Metadata, timestamps, helper text. */
  caption: font(12, 16, '400'),
} as const;

/**
 * Max width for a running paragraph, so body text stops before ~70 characters.
 * Card copy and list rows do not need it; onboarding and empty-state prose do.
 */
export const PROSE_WIDTH = 460;

// ── Elevation (three levels, platform-aware) ────────────────────────────────
//
// iOS takes the shadow properties; Android only honours `elevation`. Setting
// both unconditionally (what constants/Colors.ts does, with shadowOpacity: 1
// against a pre-multiplied rgba colour) gives Android a shadow it did not ask
// for and iOS one twice as heavy as intended.

const elev = (height: number, radius: number, opacity: number, androidElevation: number) =>
  Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation: androidElevation },
    default: {},
  }) as object;

export const E = {
  /** Bordered, no shadow. The default card — most things should be flat. */
  flat: Platform.select({ android: { elevation: 0 }, default: {} }) as object,
  /** Lifted off the page: the one card a screen wants read first. */
  raised: elev(3, 10, 0.07, 3),
  /** Sheets, modals, floating action bars. */
  overlay: elev(10, 20, 0.14, 12),
} as const;

export type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';
