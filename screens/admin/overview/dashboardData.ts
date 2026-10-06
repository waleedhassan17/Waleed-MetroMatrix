// ============================================================================
// From the server's analytics to what the home charts draw. Pure, so it is
// tested. Labels and tones come from /admin/meta (presentStatus); nothing here
// invents a figure — a day the server does not list had none, a real zero.
// ============================================================================

import type { BarListItem, ProviderTypeKey, SplitSegment, TrendPoint } from '../../../components/admin';
import type { Tone } from '../../../constants/theme';
import { presentStatus } from '../../../hooks/useAdminMeta';
import type { ConsoleMeta, ProviderTypeRegistrations } from '../../../networks/admin/adminApi';
import type { AppointmentTimeline } from '../../../networks/admin/healthcareAnalyticsApi';
import { formatCount } from '../../../utils/admin/format';
import { typeLabel } from '../healthcare/appointmentLabels';

type Daily = { date: string; count: number };

// A key the server did not send counted nothing: a real zero, not a guess.
const countAt = (m: Map<string, number>, key: string): number => {
  const v = m.get(key);
  return v === undefined ? 0 : v;
};

/** One point per day of `days`, summing what the server sent for each and 0 for the rest. */
export function fillByDay(points: { date: string; value: number }[], days: string[]): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const p of points) byDay.set(p.date, countAt(byDay, p.date) + p.value);
  return days.map((date) => ({ date, value: countAt(byDay, date) }));
}

export const dailyPoints = (daily: Daily[]): TrendPoint[] => daily.map((d) => ({ date: d.date, value: d.count }));

/** Everyone registered by the end of each day: those from before the range, plus each day's sign-ups. */
export function runningTotal(before: number, daily: Daily[]): TrendPoint[] {
  let total = before;
  return daily.map((d) => {
    total += d.count;
    return { date: d.date, value: total };
  });
}

/** What a type's providers are called as a group. The server names one ("Doctor"); a card names many. */
export const PROVIDER_TYPE_TITLE: Record<ProviderTypeKey, string> = {
  doctor: 'Doctors',
  home_service: 'Home service providers',
  vendor: 'Shopping vendors',
  pending: 'Type not chosen yet',
};

/** The donut of every registered provider by type. "Not chosen yet" only shows when someone is in it. */
export function providerTypeSegments(types: ProviderTypeRegistrations[], colorOf: (type: ProviderTypeKey) => string): SplitSegment[] {
  return types
    .filter((t) => t.type !== 'pending' || t.total > 0)
    .map((t) => ({ key: t.type, label: PROVIDER_TYPE_TITLE[t.type], value: t.total, color: colorOf(t.type) }));
}

/** Working first, then waiting, then the ones that are not working. */
export const STATE_ORDER = ['approved', 'pending', 'incomplete', 'rejected', 'suspended'] as const;

/** A type's providers by state, in the labels and tones the rest of the console uses. */
export function stateSegments(
  meta: ConsoleMeta | undefined,
  byState: ProviderTypeRegistrations['byState'],
  colorOf: (tone: Tone) => string
): SplitSegment[] {
  return STATE_ORDER.map((state) => {
    const { label, tone } = presentStatus(meta, 'providerStates', state);
    return { key: state, label, value: byState[state], color: colorOf(tone) };
  });
}

/** "1 job", "3 jobs". */
export const counted = (n: number, noun: string): string => `${formatCount(n)} ${noun}${n === 1 ? '' : 's'}`;

const capitalise = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const humanise = (s: string) => capitalise(s.replace(/[-_]+/g, ' ').trim());

/** What a type is made of: specialties, trades or categories, with "Others" for the rest. */
export function breakdownItems(meta: ConsoleMeta | undefined, breakdown: ProviderTypeRegistrations['breakdown']): BarListItem[] {
  if (!breakdown) return [];
  const name = (key: string | null, label: string | null): string => {
    if (key === null) return 'Not set';
    if (breakdown.field === 'providerSubType') {
      const described = presentStatus(meta, 'providerSubTypes', key).label;
      return described === key ? humanise(key) : described;
    }
    return capitalise((label ?? key).trim());
  };
  const items: BarListItem[] = breakdown.items.map((item) => ({
    key: item.key ?? 'not-set',
    label: name(item.key, item.label),
    value: item.count,
    display: formatCount(item.count),
  }));
  if (breakdown.other > 0) items.push({ key: 'others', label: 'Others', value: breakdown.other, display: formatCount(breakdown.other) });
  return items;
}

/** Counts by status, busiest first, named as the server names them. */
export function statusItems(meta: ConsoleMeta | undefined, group: string, entries: [string, number][]): BarListItem[] {
  return entries
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ key: status, label: presentStatus(meta, group, status).label, value: count, display: formatCount(count) }));
}

// ── Healthcare ──────────────────────────────────────────────────────────────

export const appointmentsPerDay = (timeline: AppointmentTimeline['timeline'], days: string[]): TrendPoint[] =>
  fillByDay(timeline.map((d) => ({ date: d.date, value: d.totalAppointments })), days);

/** Appointments by kind (in clinic, video) across the range, in a fixed order. */
export function consultationTypeSegments(timeline: AppointmentTimeline['timeline'], colorOf: (index: number) => string): SplitSegment[] {
  const totals = new Map<string, number>();
  for (const day of timeline) for (const t of day.types) totals.set(t.type, countAt(totals, t.type) + t.total);
  // The two kinds the backend books always show, so a range with no video
  // consultations says 0 rather than leaving video out.
  const order = ['in-clinic', 'video', ...[...totals.keys()].filter((k) => k !== 'in-clinic' && k !== 'video').sort()];
  return order.map((type, i) => ({ key: type, label: typeLabel(type) || humanise(type), value: countAt(totals, type), color: colorOf(i) }));
}

/** Booked appointments that were completed, and those that were not (yet). */
export function completionSegments(timeline: AppointmentTimeline['timeline'], colors: { done: string; rest: string }): SplitSegment[] {
  const total = timeline.reduce((n, d) => n + d.totalAppointments, 0);
  const completed = timeline.reduce((n, d) => n + d.completedAppointments, 0);
  return [
    { key: 'completed', label: 'Completed', value: completed, color: colors.done },
    { key: 'open', label: 'Not completed yet, or cancelled', value: Math.max(total - completed, 0), color: colors.rest },
  ];
}

// ── Shopping ────────────────────────────────────────────────────────────────

type ShopPoint = { label: string; gmv: number; orders: number };

export const deliveredOrdersPerDay = (series: ShopPoint[], days: string[]): TrendPoint[] =>
  fillByDay(series.map((p) => ({ date: p.label, value: p.orders })), days);

export const deliveredValuePerDay = (series: ShopPoint[], days: string[]): TrendPoint[] =>
  fillByDay(series.map((p) => ({ date: p.label, value: p.gmv })), days);
