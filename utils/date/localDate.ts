// ============================================================================
// Calendar dates as the user's device sees them.
//
// THE BUG THIS EXISTS TO PREVENT
// ------------------------------
// `new Date('2026-08-16T00:00:00')` parses as LOCAL midnight, but
// `.toISOString()` converts to UTC before formatting. East of Greenwich that
// crosses back over midnight, so the formatted date is the PREVIOUS day:
//
//   TZ=Asia/Karachi (UTC+5)
//   new Date('2026-08-16T00:00:00').toISOString().split('T')[0]  ->  '2026-08-15'
//
// Every `toISOString().split('T')[0]` on a locally-constructed date was
// therefore off by one for the whole of Pakistan. On the doctor's slot screen
// the week strip for Friday 21 Aug rendered 15–21 instead of 16–22, and because
// its leftmost cell belonged to the PREVIOUS calendar week, tapping that cell
// re-derived the week around it and jumped the strip back seven days — which
// read as "the left-most date behaves like the back arrow" rather than as a
// date bug.
//
// A calendar date is not an instant in time. It has no timezone, so it must be
// read off the local clock rather than converted through UTC.
// ============================================================================

/** `YYYY-MM-DD` for a Date, read from the LOCAL calendar. Never via UTC. */
export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's calendar date on this device. */
export function todayLocalISODate(): string {
  return toLocalISODate(new Date());
}

/**
 * Parse a `YYYY-MM-DD` into local midnight.
 *
 * `new Date('2026-08-16')` (no time part) is parsed as UTC midnight by spec,
 * which is the same off-by-one in reverse. Appending the time forces local.
 */
export function fromLocalISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** `iso` shifted by whole days, still local. */
export function addLocalDays(iso: string, days: number): string {
  const date = fromLocalISODate(iso);
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

/**
 * A timestamp as a person would say it: `3:42 PM` for today, `16 Aug, 3:42 PM`
 * otherwise. Unlike the calendar-date helpers above this one IS an instant, so
 * it goes through the local clock on purpose.
 *
 * Returns `null` for a missing or unparseable value — callers must decide what
 * an unknown time looks like, because rendering `Invalid Date` (or the raw ISO
 * string, which is what the Service Status card used to do) is never right.
 */
export function formatInstant(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (toLocalISODate(date) === todayLocalISODate()) return time;

  const day = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}
