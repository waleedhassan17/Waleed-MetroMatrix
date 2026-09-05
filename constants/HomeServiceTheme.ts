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

import { C, DARK_C, ramp, ThemeMode, Tone } from './theme';
import { AA_BODY, lift, mix } from '../theme/contrast';

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
  /**
   * Card photograph for the category.
   *
   * The home screen renders `service.image` from `/user/home` first, so the
   * backend can still own this. This is what shows when it returns nothing —
   * which is what it does today, and why every card was a tinted glyph panel.
   * Undefined for the neutral fallback: an unknown category has no photo that
   * would be honest.
   */
  photo?: string;
}

/**
 * Unsplash, cropped by the server to the card's shape.
 *
 * `crop=entropy` picks the busiest region rather than the centre, which is what
 * makes a portrait original (the plumber shot) resolve to a usable landscape
 * band instead of a slice of someone's shoulder. `w`/`h` are sized for a
 * full-width card at 3x. Every id below was fetched and looked at, not guessed.
 */
const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=entropy&w=900&h=500&q=70`;

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
    // Electrician in a hard hat wiring a wall box.
    photo: photo('photo-1621905251189-08b45d6a269e'),
  },
  plumbers: {
    label: 'Plumber',
    labelPlural: 'plumbers',
    tint: '#1D4ED8',
    tintSoft: '#EFF6FF',
    icon: 'water-outline',
    summary: 'Pipe fitting, leaks and installation',
    // Hands on a P-trap under a sink. Portrait original, so it leans on the
    // entropy crop above to land on the pipework.
    photo: photo('photo-1676210133055-eab6ef033ce3'),
  },
  'ac-repairers': {
    label: 'AC technician',
    labelPlural: 'AC technicians',
    tint: '#0E7490',
    tintSoft: '#ECFEFF',
    icon: 'snow-outline',
    summary: 'Installation, cooling faults and gas refills',
    // A clean wall-mounted condenser. The technician-on-a-roof alternatives
    // put the people too far away to read at 140pt tall; the unit itself is
    // what says "air conditioning" at card size.
    photo: photo('photo-1757219525975-03b5984bc6e8'),
  },
};

/**
 * Dark tints, DERIVED rather than hand-picked.
 *
 * Each category's `tint` was chosen to read as text on white (#B45309 amber,
 * #1D4ED8 blue, #0E7490 cyan) and its `tintSoft` is a near-white ground
 * (#FEF6EC …). Both are wrong on a dark card in opposite directions: the tint
 * goes muddy, the ground goes glaring.
 *
 * Deriving them keeps the three categories in step with each other and with
 * any category added later — hand-picking six more hexes is how the amber and
 * the blue would drift apart the first time someone edited one of them.
 * `lift` raises the tint only as far as AA against the dark card; `mix` builds
 * the ground from that same hue so the pairing still reads as one family.
 */
const darkCategoryCache = new Map<string, CategoryAccent>();

const toDark = (key: string, accent: CategoryAccent): CategoryAccent => {
  const cached = darkCategoryCache.get(key);
  if (cached) return cached;

  const tint = lift(accent.tint, AA_BODY, DARK_C.surface);
  const dark: CategoryAccent = {
    ...accent,
    tint,
    tintSoft: mix(DARK_C.surface, tint, 0.16),
  };
  darkCategoryCache.set(key, dark);
  return dark;
};

/**
 * Accent for a service category.
 *
 * An unknown or missing category returns a neutral accent rather than guessing.
 * providerProfile.tsx used to fall back to `plumbers`, so an unrecognised
 * category silently rendered someone else's colour and icon.
 */
export const categoryAccent = (
  category?: string | null,
  mode: ThemeMode = 'light',
): CategoryAccent => {
  const key = (category as ServiceCategory) in CATEGORIES ? (category as string) : 'neutral';
  const accent = CATEGORIES[category as ServiceCategory] ?? NEUTRAL_CATEGORY;

  if (mode !== 'dark') return accent;
  // The neutral fallback is built from ramp tokens, not a category hue, so it
  // is already correct in dark — deriving it would only wash it out.
  if (key === 'neutral') {
    return { ...accent, tint: DARK_C.inkMuted, tintSoft: DARK_C.surfaceSunken };
  }
  return toDark(key, accent);
};

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

// The table carries LABEL, TONE and GLYPH only. Colour is resolved from the
// active ramp at call time — a status pill hardcoded to `C.warningSoft`
// (#FEF6EC) is a near-white lozenge on a dark card, and there are six of them.
// Light is unchanged: `ramp('light')` IS `C`.
const STATUS: Record<BookingStatusKey, Omit<StatusStyle, 'color' | 'bg'>> = {
  pending: { label: 'Pending', tone: 'warning', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', tone: 'info', icon: 'checkmark-circle-outline' },
  upcoming: { label: 'Upcoming', tone: 'warning', icon: 'calendar-outline' },
  in_progress: {
    label: 'In progress',
    tone: 'info',
    icon: 'ellipsis-horizontal-circle-outline',
  },
  completed: { label: 'Completed', tone: 'success', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', tone: 'error', icon: 'close-circle-outline' },
};

/** Ink and ground for a tone, in a mode. */
const toneColours = (tone: Tone, mode: ThemeMode): { color: string; bg: string } => {
  const r = ramp(mode);
  switch (tone) {
    case 'success':
      return { color: r.success, bg: r.successSoft };
    case 'warning':
      return { color: r.warning, bg: r.warningSoft };
    case 'error':
      return { color: r.error, bg: r.errorSoft };
    case 'info':
      return { color: r.info, bg: r.infoSoft };
    default:
      return { color: r.inkMuted, bg: r.surfaceSunken };
  }
};

/** Humanise an unmapped status: `awaiting_payment` -> `Awaiting payment`. */
const humanise = (status: string) =>
  status
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

export const bookingStatus = (
  status?: string | null,
  mode: ThemeMode = 'light',
): StatusStyle => {
  if (!status) {
    return {
      label: 'Unknown',
      tone: 'neutral',
      icon: 'help-circle-outline',
      ...toneColours('neutral', mode),
    };
  }

  const known = STATUS[status as BookingStatusKey];
  if (known) return { ...known, ...toneColours(known.tone, mode) };

  return {
    label: humanise(status),
    tone: 'neutral',
    icon: 'ellipse-outline',
    ...toneColours('neutral', mode),
  };
};

/** Statuses where a provider is assigned and reachable, so call/chat make sense. */
export const ACTIVE_STATUSES: BookingStatusKey[] = ['confirmed', 'upcoming', 'in_progress'];
