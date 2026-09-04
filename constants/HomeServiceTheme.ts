// ============================================================================
// Home Services — accent layer over the base tokens
//
// Home services is one of three verticals in a super-app. It does NOT get its
// own design language: it gets the shared neutrals, type, radius and elevation
// from constants/theme.ts plus the small accent below.
//
// WHAT THIS FILE REPLACES
// -----------------------
// Ten screens each declared their own SERVICE_CONFIG with byte-identical
// amber/blue/cyan gradient pairs, and at least four declared their own status
// colour map. `categoryAccent()` and `bookingStatus()` are the single sources
// of truth for both. Import them; never re-declare the maps in a screen.
//
// ONE GRADIENT
// ------------
// `heroGradient` is consumed by exactly one component (components/ui/HeroBanner)
// in exactly one place (the booking-confirmation success state). A gradient used
// on headers, avatars, badges, chips and buttons stops being an accent and
// becomes the base surface — which is what the old screens did 132 times.
// ============================================================================

import { C, Tone } from './theme';

export const HS = {
  /** Primary action, selected state, accent iconography. */
  accent: '#059669',
  /** Pressed state, and accent-coloured text (passes contrast on white). */
  accentDeep: '#047857',
  /** Selected chip / soft accent ground. */
  accentSoft: '#ECFDF5',
  /** Accent hairline and borders on selected controls. */
  accentLine: '#A7F3D0',

  /** THE one brand gradient. See the note above before using it anywhere new. */
  heroGradient: ['#047857', '#059669'] as [string, string],
} as const;

// ── Service categories ──────────────────────────────────────────────────────
//
// A category is identity, not decoration: it earns a 3px hairline on a card and
// a tinted icon. It never gets a full-bleed gradient, a coloured header or a
// coloured card ground.

export type ServiceCategory = 'electricians' | 'plumbers' | 'ac-repairers';

export interface CategoryAccent {
  /** Singular, how a person says it. Used in card rules and titles. */
  label: string;
  /** Plural, for list headers ("12 electricians available"). */
  labelPlural: string;
  /** The hairline + icon colour. Dark enough to read as text. */
  tint: string;
  /** Ground behind a tinted icon. */
  tintSoft: string;
  /** Ionicons glyph. */
  icon: string;
  /** What the trade actually does. Plain text — no emoji, no bullet soup. */
  summary: string;
}

const NEUTRAL_CATEGORY: CategoryAccent = {
  label: 'Service',
  labelPlural: 'providers',
  tint: C.inkMuted,
  tintSoft: C.surfaceSunken,
  icon: 'construct-outline',
  summary: 'Home services',
};

const CATEGORIES: Record<ServiceCategory, CategoryAccent> = {
  electricians: {
    label: 'Electrician',
    labelPlural: 'electricians',
    tint: '#B45309',
    tintSoft: '#FEF6EC',
    icon: 'flash-outline',
    summary: 'Wiring, installation and repairs',
  },
  plumbers: {
    label: 'Plumber',
    labelPlural: 'plumbers',
    tint: '#1D4ED8',
    tintSoft: '#EFF6FF',
    icon: 'water-outline',
    summary: 'Pipe fitting, leaks and installation',
  },
  'ac-repairers': {
    label: 'AC technician',
    labelPlural: 'AC technicians',
    tint: '#0E7490',
    tintSoft: '#ECFEFF',
    icon: 'snow-outline',
    summary: 'Installation, cooling faults and gas refills',
  },
};

/**
 * Accent for a service category.
 *
 * An unknown or missing category returns a neutral accent rather than guessing.
 * providerProfile.tsx used to fall back to `plumbers`, so an unrecognised
 * category silently rendered someone else's colour and icon.
 */
export const categoryAccent = (category?: string | null): CategoryAccent =>
  CATEGORIES[category as ServiceCategory] ?? NEUTRAL_CATEGORY;

export const isServiceCategory = (value?: string | null): value is ServiceCategory =>
  !!value && value in CATEGORIES;

export const SERVICE_CATEGORIES = Object.keys(CATEGORIES) as ServiceCategory[];

// ── Booking / job status ────────────────────────────────────────────────────
//
// The server's vocabulary is wider than any one screen's filter tabs, and a
// missing key used to crash the list on lookup. Every status resolves here, and
// an unrecognised one degrades to a readable neutral pill instead of throwing.

export type BookingStatusKey =
  | 'pending'
  | 'confirmed'
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface StatusStyle {
  label: string;
  tone: Tone;
  /** Text and icon colour. */
  color: string;
  /** Pill ground. */
  bg: string;
  /** Ionicons glyph. */
  icon: string;
}

const STATUS: Record<BookingStatusKey, StatusStyle> = {
  pending: {
    label: 'Pending',
    tone: 'warning',
    color: C.warning,
    bg: C.warningSoft,
    icon: 'time-outline',
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'info',
    color: C.info,
    bg: C.infoSoft,
    icon: 'checkmark-circle-outline',
  },
  upcoming: {
    label: 'Upcoming',
    tone: 'warning',
    color: C.warning,
    bg: C.warningSoft,
    icon: 'calendar-outline',
  },
  in_progress: {
    label: 'In progress',
    tone: 'info',
    color: C.info,
    bg: C.infoSoft,
    icon: 'ellipsis-horizontal-circle-outline',
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    color: C.success,
    bg: C.successSoft,
    icon: 'checkmark-done-outline',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'error',
    color: C.error,
    bg: C.errorSoft,
    icon: 'close-circle-outline',
  },
};

/** Humanise an unmapped status: `awaiting_payment` -> `Awaiting payment`. */
const humanise = (status: string) =>
  status
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

export const bookingStatus = (status?: string | null): StatusStyle => {
  if (!status) return { ...STATUS.pending, label: 'Unknown', tone: 'neutral', color: C.inkMuted, bg: C.surfaceSunken, icon: 'help-circle-outline' };
  return (
    STATUS[status as BookingStatusKey] ?? {
      label: humanise(status),
      tone: 'neutral',
      color: C.inkMuted,
      bg: C.surfaceSunken,
      icon: 'ellipse-outline',
    }
  );
};

/** Statuses where a provider is assigned and reachable, so call/chat make sense. */
export const ACTIVE_STATUSES: BookingStatusKey[] = ['confirmed', 'upcoming', 'in_progress'];
