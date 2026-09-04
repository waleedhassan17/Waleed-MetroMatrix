// ============================================================================
// Home Services — display formatters
//
// Thin on purpose. The real work already exists elsewhere and is reused:
//   utils/date/localDate.ts  -> formatInstant (timezone-safe, null-safe)
//   constants/Currency.ts    -> formatMoney   ("PKR 3,500")
//
// What these add is the *absence* rules: a rating of 0 is not a rating, a price
// of 0 before completion is not a price, and an unparseable date is not a date.
// The old screens rendered `★ 0`, `PKR 0` and raw ISO strings because every
// formatter assumed the value was there.
// ============================================================================

import { formatMoney } from '../../constants/Currency';
import { formatInstant, toLocalISODate, todayLocalISODate } from '../date/localDate';

export { formatInstant };

/**
 * A booking's calendar date the way a person says it: `Sat, 6 Sep`.
 * Today and tomorrow are named rather than dated.
 *
 * Accepts `YYYY-MM-DD` (the booking API's shape) or a full ISO instant.
 * Returns null for anything unparseable — callers decide what unknown looks
 * like, because printing the raw string is never right.
 */
export function formatBookingDate(value?: string | null): string | null {
  if (!value) return null;

  // A bare `YYYY-MM-DD` is parsed as UTC midnight by spec, which lands on the
  // previous day east of Greenwich. Force local by appending a time.
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const iso = toLocalISODate(date);
  const today = todayLocalISODate();
  if (iso === today) return 'Today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === toLocalISODate(tomorrow)) return 'Tomorrow';

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** A time slot as stored (`14:30`, `2:30 PM`, or an ISO instant) -> `2:30 PM`. */
export function formatBookingTime(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const date = new Date();
    date.setHours(Number(hhmm[1]), Number(hhmm[2]), 0, 0);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  // Already human ("2:30 PM"). Pass it through rather than mangling it.
  return trimmed;
}

/**
 * The one line a booking card shows for when: `Sat, 6 Sep · 2:30 PM`.
 * Drops whichever half is missing rather than printing a dangling separator.
 */
export function formatBookingWhen(date?: string | null, time?: string | null): string {
  const parts = [formatBookingDate(date), formatBookingTime(time)].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Time to be confirmed';
}

/**
 * A booking's price. A home-service job is priced on completion, so zero means
 * "not yet quoted" — rendering "PKR 0" read as a free job.
 */
export function formatPrice(amount?: number | null, fallback = 'Priced on completion'): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return fallback;
  return formatMoney(amount);
}

/** A settled amount, where zero is a real value worth showing. */
export function formatAmount(amount?: number | null, decimals = false): string {
  return formatMoney(Number.isFinite(amount as number) ? (amount as number) : 0, { decimals });
}

/**
 * A rating, or null when there isn't one.
 *
 * This is what removes every `★ 0` pill: a provider with no reviews has no
 * rating, and the correct rendering of no rating is nothing at all.
 */
export function formatRating(value?: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value.toFixed(1);
}

/** `12 reviews` / `1 review` / null when there are none. */
export function formatReviewCount(count?: number | null): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null;
  return `${count} ${count === 1 ? 'review' : 'reviews'}`;
}

/** Elapsed time as a duration: `1h 12m`, `12m`, `just now`. */
export function formatDuration(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

/** `Just now` / `12m ago` / `3h ago` / `Yesterday` / `16 Aug`. */
export function relativeTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatInstant(value) ?? '';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (toLocalISODate(date) === toLocalISODate(yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Initials for an avatar fallback. `Ahmed Raza` -> `AR`.
 * Returns null when there is no usable name, so the caller shows an icon.
 */
export function initialsOf(name?: string | null): string | null {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const letters = parts.slice(0, 2).map((p) => p[0]);
  const initials = letters.join('').toUpperCase();
  return /[A-Z0-9]/.test(initials) ? initials : null;
}
