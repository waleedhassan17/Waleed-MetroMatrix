// ============================================================================
// How an /overview metric is shown: its value in its unit, and the period it
// covers. Every figure states its period — "Today", "Month to date" — because
// the old dashboard showed all-time totals under monthly headings.
// ============================================================================

import { formatMoney } from '../../../constants/Currency';
import type { Schemas } from '../../../networks/admin/client';
import { formatCount, formatDelta, formatPercent, MISSING } from '../../../utils/admin/format';

export type Metric = Schemas['Metric'];

const PERIOD: Record<Metric['period'], string> = {
  today: 'Today',
  now: 'Now',
  month_to_date: 'Month to date',
  all_time: 'All time',
};

export function metricValue(m: Metric): string {
  if (m.value === null || m.value === undefined) return MISSING;
  if (m.unit === 'count') return formatCount(m.value);
  if (m.unit === 'percent') return formatPercent(m.value);
  return formatMoney(m.value, { code: m.unit });
}

export function metricCaption(m: Metric): string {
  const period = PERIOD[m.period] ?? m.period;
  if (m.comparedTo === undefined) return period;
  if (m.delta === null || m.delta === undefined) return `${period} · no baseline last month`;
  return `${period} · ${formatDelta(m.delta)} vs same period last month`;
}

/** Backlogs and problems read as warnings when non-zero. */
const ATTENTION = new Set(['open_disputes', 'pending_doctors', 'open_returns', 'low_stock']);

export const metricTone = (m: Metric): 'neutral' | 'warning' =>
  ATTENTION.has(m.key) && typeof m.value === 'number' && m.value > 0 ? 'warning' : 'neutral';
