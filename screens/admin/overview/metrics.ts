// ============================================================================
// How a server metric is shown: its value in its unit, the period it covers,
// its change (as a trend chip) and an icon. Every figure states its period —
// "Today", "Month to date", "Last 30 days" — because the old dashboard showed
// all-time totals under monthly headings.
// ============================================================================

import { formatMoney } from '../../../constants/Currency';
import type { Schemas } from '../../../networks/admin/client';
import { formatCount, formatPercent, MISSING } from '../../../utils/admin/format';

export type Metric = Schemas['Metric'];

const PERIOD: Record<Metric['period'], string> = {
  today: 'Today',
  now: 'Now',
  month_to_date: 'Month to date',
  all_time: 'All time',
  range: 'This period',
};

const COMPARED: Record<string, string> = {
  same_period_last_month: 'vs same period last month',
  previous_range: 'vs the period before',
};

export function metricValue(m: Metric): string {
  if (m.value === null || m.value === undefined) return MISSING;
  if (m.unit === 'count') return formatCount(m.value);
  if (m.unit === 'percent') return formatPercent(m.value);
  if (m.unit === 'rating') return `${m.value.toFixed(1)} ★`;
  if (m.unit === 'minutes') return `${formatCount(m.value)} min`;
  return formatMoney(m.value, { code: m.unit });
}

/**
 * The period, and what the trend chip compares with. `rangeLabel` replaces
 * "This period" with the range the screen picked ("Last 30 days").
 */
export function metricCaption(m: Metric, rangeLabel?: string): string {
  const period = m.period === 'range' && rangeLabel ? rangeLabel : PERIOD[m.period] ?? m.period;
  if (m.comparedTo === undefined) return period;
  if (m.delta === null || m.delta === undefined) return `${period} · nothing to compare with`;
  return `${period} · ${COMPARED[m.comparedTo] ?? `vs ${m.comparedTo.replace(/_/g, ' ')}`}`;
}

/** The change for the trend chip; null hides it. */
export const metricDelta = (m: Metric): number | null => (typeof m.delta === 'number' ? m.delta : null);

/** Figures where going up is bad news. */
const LOWER_IS_BETTER = new Set(['cancellation_rate', 'return_rate', 'open_disputes', 'open_returns', 'low_stock', 'pending_doctors']);
export const higherIsBetter = (m: Metric) => !LOWER_IS_BETTER.has(m.key);

/** Backlogs and problems read as warnings when non-zero. */
const ATTENTION = new Set(['open_disputes', 'pending_doctors', 'open_returns', 'low_stock']);

export const metricTone = (m: Metric): 'neutral' | 'warning' =>
  ATTENTION.has(m.key) && typeof m.value === 'number' && m.value > 0 ? 'warning' : 'neutral';

const ICONS: Record<string, string> = {
  users_total: 'people-outline',
  users_new: 'person-add-outline',
  providers_approved: 'briefcase-outline',
  providers_new: 'person-add-outline',
  bookings_today: 'calendar-outline',
  gmv_today: 'cash-outline',
  open_disputes: 'chatbox-ellipses-outline',
  providers_online: 'radio-outline',
  appointments_today: 'medkit-outline',
  revenue_today: 'cash-outline',
  cancellation_rate: 'close-circle-outline',
  pending_doctors: 'shield-checkmark-outline',
  orders_today: 'bag-handle-outline',
  open_returns: 'return-down-back-outline',
  low_stock: 'alert-circle-outline',
  jobs: 'construct-outline',
  appointments: 'medkit-outline',
  orders: 'bag-handle-outline',
  paid: 'cash-outline',
  delivered_value: 'cash-outline',
  completed: 'checkmark-done-outline',
  delivered: 'checkmark-done-outline',
  completion_rate: 'checkmark-circle-outline',
  on_time_rate: 'time-outline',
  repeat_customers: 'repeat-outline',
  rating: 'star-outline',
  avg_job_minutes: 'stopwatch-outline',
  upcoming: 'calendar-outline',
  clinics: 'business-outline',
  return_rate: 'return-down-back-outline',
  avg_order_value: 'receipt-outline',
  products: 'pricetags-outline',
};

export const metricIcon = (m: Metric): string => ICONS[m.key] ?? 'stats-chart-outline';
