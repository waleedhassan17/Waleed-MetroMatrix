// ============================================================================
// Weekly hours and calendar-day arithmetic for the doctor's Availability hub.
//
// `validateDay` mirrors the server's rules (backend availabilityService) so a
// doctor sees the problem next to the period while editing, instead of a save
// that fails. The server still decides; this only saves a round trip.
// Pure: safe to unit test.
// ============================================================================

export const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** Monday first — how a working week is read. */
export const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface TimeRange {
  startTime: string;
  endTime: string;
  clinicId?: string | null;
}

export interface ModeBlock {
  enabled: boolean;
  ranges: TimeRange[];
}

export interface EditableDay {
  day: Weekday;
  isWorking: boolean;
  online: ModeBlock;
  onsite: ModeBlock;
}

export type DayMode = 'online' | 'onsite';

export type RangeIssueCode =
  | 'BAD_TIME'
  | 'START_NOT_BEFORE_END'
  | 'RANGE_SHORTER_THAN_SLOT'
  | 'CLINIC_REQUIRED'
  | 'OVERLAP_SAME_MODE';

export interface RangeIssue {
  mode: DayMode;
  index: number;
  code: RangeIssueCode;
  message: string;
}

export function toMinutes(hhmm?: string | null): number | null {
  const m = HHMM.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function fromMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

const MODE_WORD: Record<DayMode, string> = { online: 'Video', onsite: 'In-clinic' };

/**
 * Problems with one day's periods. Only a working day's enabled modes are
 * checked — a switched-off block publishes nothing.
 */
export function validateDay(day: EditableDay, { slotDuration }: { slotDuration: number }): {
  issues: RangeIssue[];
  warnings: string[];
} {
  const issues: RangeIssue[] = [];
  const warnings: string[] = [];
  if (!day.isWorking) return { issues, warnings };

  const intervals: { mode: DayMode; index: number; start: number; end: number }[] = [];

  (['online', 'onsite'] as DayMode[]).forEach((mode) => {
    const block = day[mode];
    if (!block.enabled) return;
    block.ranges.forEach((range, index) => {
      const start = toMinutes(range.startTime);
      const end = toMinutes(range.endTime);
      if (start === null || end === null) {
        issues.push({ mode, index, code: 'BAD_TIME', message: 'Choose a start and end time' });
        return;
      }
      if (start >= end) {
        issues.push({ mode, index, code: 'START_NOT_BEFORE_END', message: 'End must be after start' });
        return;
      }
      if (end - start < slotDuration) {
        issues.push({
          mode,
          index,
          code: 'RANGE_SHORTER_THAN_SLOT',
          message: `Shorter than one ${slotDuration}-minute slot`,
        });
      }
      if (mode === 'onsite' && !range.clinicId) {
        issues.push({ mode, index, code: 'CLINIC_REQUIRED', message: 'Choose a clinic' });
      }
      intervals.push({ mode, index, start, end });
    });
  });

  intervals.sort((a, b) => a.start - b.start);
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length && intervals[j].start < intervals[i].end; j += 1) {
      const a = intervals[i];
      const b = intervals[j];
      if (a.mode === b.mode) {
        issues.push({
          mode: b.mode,
          index: b.index,
          code: 'OVERLAP_SAME_MODE',
          message: `Overlaps another ${MODE_WORD[b.mode].toLowerCase()} period`,
        });
      } else {
        warnings.push(
          `Video and in-clinic overlap ${fromMinutes(Math.max(a.start, b.start))}–${fromMinutes(
            Math.min(a.end, b.end)
          )}. Booking one closes the other.`
        );
      }
    }
  }

  return { issues, warnings };
}

/** Validate every day. `hasErrors` gates saving. */
export function validateWeek(days: EditableDay[], opts: { slotDuration: number }) {
  const issuesByDay: Partial<Record<Weekday, RangeIssue[]>> = {};
  const warningsByDay: Partial<Record<Weekday, string[]>> = {};
  let hasErrors = false;
  for (const day of days) {
    const { issues, warnings } = validateDay(day, opts);
    if (issues.length) {
      issuesByDay[day.day] = issues;
      hasErrors = true;
    }
    if (warnings.length) warningsByDay[day.day] = warnings;
  }
  return { issuesByDay, warningsByDay, hasErrors };
}

/** How many slots a period yields: slots of `duration` separated by `buffer`. */
export function slotsInRange(range: TimeRange, duration: number, buffer = 0): number {
  const start = toMinutes(range.startTime);
  const end = toMinutes(range.endTime);
  if (start === null || end === null || duration <= 0 || end - start < duration) return 0;
  return Math.floor((end - start + buffer) / (duration + buffer));
}

/** Slots one week of these hours publishes. */
export function weeklySlotCount(
  days: EditableDay[],
  duration: number,
  buffer = 0,
  { videoEnabled = true }: { videoEnabled?: boolean } = {}
): number {
  let total = 0;
  for (const day of days) {
    if (!day.isWorking) continue;
    if (videoEnabled && day.online.enabled) {
      total += day.online.ranges.reduce((n, r) => n + slotsInRange(r, duration, buffer), 0);
    }
    if (day.onsite.enabled) {
      total += day.onsite.ranges.reduce((n, r) => n + slotsInRange(r, duration, buffer), 0);
    }
  }
  return total;
}

/**
 * A sensible next period after the existing ones: an hour's break after the
 * last one, up to three hours long. Null when there is no room left in the day.
 * The old "add period" could start a new period inside the previous one.
 */
export function suggestNextRange(ranges: TimeRange[], duration: number): TimeRange | null {
  const ends = ranges.map((r) => toMinutes(r.endTime)).filter((m): m is number => m !== null);
  const lastEnd = ends.length ? Math.max(...ends) : null;
  const dayEnd = 23 * 60 + 59;

  const tryFrom = (start: number) => {
    const end = Math.min(start + 180, dayEnd);
    return end - start >= Math.max(duration, 15) ? { startTime: fromMinutes(start), endTime: fromMinutes(end) } : null;
  };

  if (lastEnd === null) return tryFrom(9 * 60);
  return tryFrom(lastEnd + 60) ?? tryFrom(lastEnd);
}

/** Seven days off, Monday first. */
export function blankWeek(): EditableDay[] {
  return WEEKDAYS.map((day) => ({
    day,
    isWorking: false,
    online: { enabled: false, ranges: [] },
    onsite: { enabled: false, ranges: [] },
  }));
}

const idOf = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '') || null;
};

/**
 * The server's weeklyAvailability as seven editable days, Monday first.
 * A period's clinic falls back to the day-level clinic older documents carry.
 */
export function normalizeWeek(raw: any[] | null | undefined): EditableDay[] {
  const byDay = new Map<string, any>((raw || []).map((d) => [d?.day, d]));
  return WEEKDAYS.map((day) => {
    const src = byDay.get(day) || {};
    const block = (mode: DayMode): ModeBlock => {
      const b = src[mode] || {};
      const fallbackClinic = idOf(b.clinicId);
      return {
        enabled: !!b.enabled,
        ranges: (Array.isArray(b.ranges) ? b.ranges : []).map((r: any) => ({
          startTime: r?.startTime || '',
          endTime: r?.endTime || '',
          clinicId: mode === 'onsite' ? idOf(r?.clinicId) ?? fallbackClinic : idOf(r?.clinicId),
        })),
      };
    };
    return { day, isWorking: !!src.isWorking, online: block('online'), onsite: block('onsite') };
  });
}

/** Editable days back into the shape the server stores. */
export function toServerWeek(days: EditableDay[]) {
  return days.map((d) => ({
    day: d.day,
    isWorking: d.isWorking,
    online: {
      enabled: d.online.enabled,
      ranges: d.online.ranges.map((r) => ({ startTime: r.startTime, endTime: r.endTime, clinicId: r.clinicId ?? null })),
    },
    onsite: {
      enabled: d.onsite.enabled,
      ranges: d.onsite.ranges.map((r) => ({ startTime: r.startTime, endTime: r.endTime, clinicId: r.clinicId ?? null })),
    },
  }));
}

// ── Calendar days (local, never UTC) ───────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

/** A Date's local calendar day as `YYYY-MM-DD`. */
export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayDateKey(now: Date = new Date()): string {
  return dateKeyOf(now);
}

const noonOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

export function addDaysToKey(key: string, days: number): string {
  const d = noonOf(key);
  d.setDate(d.getDate() + days);
  return dateKeyOf(d);
}

/** Monday of the week containing `key`. */
export function mondayOf(key: string): string {
  const d = noonOf(key);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return dateKeyOf(d);
}

/** The seven days of `key`'s week, Monday first. */
export function weekOf(key: string): string[] {
  const monday = mondayOf(key);
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(monday, i));
}

export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((noonOf(to).getTime() - noonOf(from).getTime()) / 86400000);
}
