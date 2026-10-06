// ============================================================================
// The window every chart on the home screen covers: the last N Pakistan
// calendar days, today included. Pure, so it is tested.
//
// One window, two spellings, because the endpoints disagree:
//   from / to          ISO instants — home-service and shopping analytics,
//                      exactly as their own analytics screens send them
//   fromKey / toKey    'YYYY-MM-DD' Pakistan days — registrations and
//                      healthcare
// ============================================================================

import { pktDate } from '../../../networks/admin/healthcareAnalyticsApi';

export type DashboardRange = '7d' | '30d' | '90d';

export const DASHBOARD_RANGES: { value: DashboardRange; label: string; days: number }[] = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
];

const DAY_MS = 86_400_000;

export interface RangeWindow {
  days: number;
  from: string;
  to: string;
  fromKey: string;
  toKey: string;
}

export function rangeWindow(days: number, now = new Date()): RangeWindow {
  return {
    days,
    from: new Date(now.getTime() - days * DAY_MS).toISOString(),
    to: now.toISOString(),
    fromKey: pktDate(new Date(now.getTime() - (days - 1) * DAY_MS)),
    toKey: pktDate(now),
  };
}

/** Every Pakistan day of the window, oldest first. */
export function windowDays(w: RangeWindow): string[] {
  const end = Date.parse(`${w.toKey}T00:00:00Z`);
  return Array.from({ length: w.days }, (_, i) => new Date(end - (w.days - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

export const rangeLabel = (range: DashboardRange): string => `Last ${DASHBOARD_RANGES.find((r) => r.value === range)?.label ?? range}`;
