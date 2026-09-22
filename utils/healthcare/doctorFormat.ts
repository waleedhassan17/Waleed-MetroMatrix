// ============================================================================
// Formatting for the doctor app — times, durations, dates and status labels.
//
// `formatTime12` was copied into three screens, and five screens each had a
// status colour map that disagreed with the others. One implementation each.
// Pure: safe to unit test.
// ============================================================================

import type { Tone } from '../../constants/theme';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ── Time ────────────────────────────────────────────────────────────────────

/** `HH:mm` → "9:05 AM". Empty string for anything that is not a time. */
export function formatTime12(hhmm?: string | null): string {
  const m = HHMM.exec(hhmm || '');
  if (!m) return '';
  const hour = Number(m[1]);
  return `${hour % 12 || 12}:${m[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** `HH:mm` in the device's clock style. */
export function formatTime(hhmm?: string | null, uses24h = false): string {
  if (!HHMM.test(hhmm || '')) return '';
  return uses24h ? (hhmm as string) : formatTime12(hhmm);
}

export function formatTimeRange(start?: string | null, end?: string | null, uses24h = false): string {
  const a = formatTime(start, uses24h);
  const b = formatTime(end, uses24h);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** Minutes from `start` to `end` (`HH:mm`), or 0 when either is invalid. */
export function minutesBetween(start?: string | null, end?: string | null): number {
  const a = HHMM.exec(start || '');
  const b = HHMM.exec(end || '');
  if (!a || !b) return 0;
  return Math.max(0, Number(b[1]) * 60 + Number(b[2]) - (Number(a[1]) * 60 + Number(a[2])));
}

/** 30 → "30 min", 60 → "1 h", 75 → "1 h 15 min". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Whether the device shows a 24-hour clock. Falls back to 12-hour — the common
 * setting in Pakistan — when the platform does not say.
 */
export function uses24HourClock(): boolean {
  try {
    const options = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions() as {
      hourCycle?: string;
      hour12?: boolean;
    };
    if (options.hourCycle) return options.hourCycle === 'h23' || options.hourCycle === 'h24';
    if (typeof options.hour12 === 'boolean') return !options.hour12;
  } catch {
    // Intl unavailable — fall through.
  }
  return false;
}

const toMs = (value?: string | Date | null) => (value ? new Date(value).getTime() : NaN);

/**
 * When an appointment starts, relative to now: "In 25 min", "In progress",
 * "Tomorrow". Empty when the time is unknown.
 */
export function relativeStart(
  startUtc?: string | Date | null,
  endUtc?: string | Date | null,
  now: Date = new Date()
): string {
  const start = toMs(startUtc);
  if (Number.isNaN(start)) return '';
  const endMs = toMs(endUtc);
  const end = Number.isNaN(endMs) ? start : endMs;
  const t = now.getTime();

  if (t >= start && t < end) return 'In progress';
  if (t < start) {
    const minutes = Math.round((start - t) / 60000);
    if (minutes < 1) return 'Starting now';
    if (minutes < 60) return `In ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `In ${hours} h`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Tomorrow' : `In ${days} days`;
  }
  const ago = Math.round((t - end) / 60000);
  return ago < 60 ? `Ended ${Math.max(ago, 1)} min ago` : 'Ended';
}

/**
 * True from `leadMinutes` before the start until the end — when a "Live" badge
 * and a join button are honest. The dashboard showed "Live" for anything
 * pending or confirmed, hours ahead.
 */
export function isLiveWindow(
  startUtc?: string | Date | null,
  endUtc?: string | Date | null,
  now: Date = new Date(),
  leadMinutes = 10
): boolean {
  const start = toMs(startUtc);
  const end = toMs(endUtc);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const t = now.getTime();
  return t >= start - leadMinutes * 60000 && t < end;
}

/**
 * How long before a consultation's start time it can be opened.
 *
 * Must match the patient side (`callJoinTime` in the patient's appointment
 * detail slice): if the two disagree, one party is calling a room the other
 * cannot enter.
 */
export const CONSULT_LEAD_MINUTES = 15;

/**
 * True when the consultation can actually be held right now.
 *
 * The doctor's "Start video call" button had NO time gate — it rendered for
 * any confirmed appointment, so a doctor could open a call weeks early. The
 * patient could not answer it (their join opens 15 minutes before), and the
 * appointment was then stranded: the backend refuses to complete a future
 * appointment, so there was no way to close it out and no payout.
 */
export function isConsultationOpen(
  startUtc?: string | Date | null,
  endUtc?: string | Date | null,
  now: Date = new Date()
): boolean {
  return isLiveWindow(startUtc, endUtc, now, CONSULT_LEAD_MINUTES);
}

/**
 * Today's `YYYY-MM-DD` in a given zone, falling back to the device's day.
 *
 * `dateKey` on an appointment is the calendar day AT THE CLINIC. Comparing it
 * against the phone's day made controls appear or vanish a day early for a
 * doctor in a different zone from their clinic — and the server, which decides
 * the same question in the appointment's own zone, then disagreed with the app.
 */
export function todayKeyInZone(timeZone?: string | null, now: Date = new Date()): string {
  if (timeZone) {
    try {
      // en-CA renders as YYYY-MM-DD, which is exactly the dateKey format.
      return now.toLocaleDateString('en-CA', { timeZone });
    } catch {
      // An unknown zone string — fall through to the device day.
    }
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Dates ───────────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` → a local Date at noon (noon, so no DST edge moves the day). */
export function dateFromKey(key?: string | null): Date | null {
  const m = DATE_KEY.exec(key || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/** "Tue, 15 Sep" — or "15 Sep 2026" with year and no weekday. */
export function formatDateLabel(key: string, { weekday = true, year = false } = {}): string {
  const d = dateFromKey(key);
  if (!d) return '';
  const day = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`;
  return weekday ? `${WEEKDAYS_SHORT[d.getDay()]}, ${day}` : day;
}

/** "Today", "Tomorrow", "Yesterday", else "Tue, 15 Sep". */
export function formatDayHeading(key: string, todayKey: string): string {
  const d = dateFromKey(key);
  const t = dateFromKey(todayKey);
  if (!d || !t) return '';
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDateLabel(key, { weekday: true, year: d.getFullYear() !== t.getFullYear() });
}

/** "September 2026". */
export function formatMonthYear(key: string): string {
  const d = dateFromKey(key);
  return d ? `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` : '';
}

// ── Labels ──────────────────────────────────────────────────────────────────

export type ConsultationType = 'video' | 'in-clinic';

export const consultationLabel = (type?: string | null) => (type === 'video' ? 'Video' : 'In-clinic');
export const consultationIcon = (type?: string | null) => (type === 'video' ? 'videocam-outline' : 'business-outline');

export interface StatusMeta {
  label: string;
  tone: Tone;
}

const APPOINTMENT_STATUS: Record<string, StatusMeta> = {
  pending: { label: 'Awaiting approval', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'error' },
  'no-show': { label: 'No-show', tone: 'error' },
};

const capitalise = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ') : '');

export function appointmentStatusMeta(status?: string | null): StatusMeta {
  return APPOINTMENT_STATUS[status || ''] ?? { label: capitalise(status || 'Unknown'), tone: 'neutral' };
}

const SLOT_STATE: Record<string, StatusMeta> = {
  open: { label: 'Open', tone: 'success' },
  requested: { label: 'Requested', tone: 'warning' },
  booked: { label: 'Booked', tone: 'accent' },
  held: { label: 'Unavailable', tone: 'neutral' },
  blocked: { label: 'Closed', tone: 'neutral' },
  past: { label: 'Past', tone: 'neutral' },
};

export function slotStateMeta(state?: string | null): StatusMeta {
  return SLOT_STATE[state || ''] ?? { label: capitalise(state || 'Unknown'), tone: 'neutral' };
}
