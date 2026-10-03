// ============================================================================
// Healthcare analytics (GET /api/v1/admin/analytics/*), on the admin data layer.
//
// The contract types these module endpoints with a generic envelope (backend
// docs/ADMIN_OPEN_ITEMS.md #14), so the shapes are declared here from the
// controller (src/controllers/adminAnalyticsController.js). The paths are still
// checked against the contract by the typed client.
// ============================================================================

import { adminApi, type AdminError } from './adminApi';
import { adminApi as http } from './client';
import { toAdminApiError } from './errors';

export interface HealthcareStats {
  totalDoctors: number;
  verifiedDoctors: number;
  pendingVerification: number;
  totalAppointments: number;
  /** Completed-consultation revenue, month to date (Pakistan time). */
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  /** % vs the same period last month; null when there was no baseline. */
  growth: number | null;
  growthComparedTo: string;
}

export interface AppointmentTimeline {
  period: 'daily' | 'weekly' | 'monthly';
  timeline: {
    date: string;
    totalAppointments: number;
    completedAppointments: number;
    types: { type: string; total: number; completed: number }[];
  }[];
  /** Completed ÷ booked across the range; null when nothing was booked. */
  overallCompletionRate: number | null;
}

export interface RevenueRow {
  specialtyId?: string;
  specialtyName?: string | null;
  doctorId?: string;
  doctorName?: string | null;
  totalRevenue: number;
  appointmentCount: number;
}

export type AnalyticsRange = { startDate?: string; endDate?: string };

const fail = (err: unknown): { error: AdminError } => {
  const e = toAdminApiError(err);
  return { error: { status: e.status, code: e.code, message: e.message, details: e.details, requestId: e.requestId } };
};

const healthcareAnalyticsApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    getHealthcareStats: build.query<HealthcareStats, void>({
      queryFn: async () => {
        try {
          return { data: (await http.get('/api/v1/admin/analytics/stats')).data as unknown as HealthcareStats };
        } catch (err) {
          return fail(err);
        }
      },
    }),
    getAppointmentTimeline: build.query<AppointmentTimeline, AnalyticsRange>({
      queryFn: async (range) => {
        try {
          const res = await http.get('/api/v1/admin/analytics/appointments', { query: { period: 'monthly', ...range } });
          return { data: res.data as unknown as AppointmentTimeline };
        } catch (err) {
          return fail(err);
        }
      },
    }),
    getRevenueBreakdown: build.query<RevenueRow[], AnalyticsRange & { groupBy: 'specialty' | 'doctor' }>({
      queryFn: async ({ groupBy, ...range }) => {
        try {
          const res = await http.get('/api/v1/admin/analytics/revenue', { query: { groupBy, ...range } });
          const rows = (res.data as unknown as { revenue?: RevenueRow[] })?.revenue;
          return { data: Array.isArray(rows) ? rows : [] };
        } catch (err) {
          return fail(err);
        }
      },
    }),
  }),
});

export const { useGetHealthcareStatsQuery, useGetAppointmentTimelineQuery, useGetRevenueBreakdownQuery } = healthcareAnalyticsApi;

// Pakistan has kept UTC+5 all year since 2009, so a fixed offset is exact and
// does not depend on the device's time zone or Intl support.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' for `date` in Pakistan time. */
export const pktDate = (date: Date): string => new Date(date.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);

export type RangeKey = 'month' | '90d' | 'all';

/** The date filter for a range key, in Pakistan time. */
export function rangeFor(key: RangeKey, now = new Date()): AnalyticsRange {
  if (key === 'all') return {};
  const end = pktDate(now);
  if (key === 'month') return { startDate: `${end.slice(0, 8)}01`, endDate: end };
  return { startDate: pktDate(new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000)), endDate: end };
}

/** '2026-10' → 'Oct 2026'; daily/weekly keys pass through. */
export function monthLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}
