// ============================================================================
// The analytics service (backend src/modules/analytics): live usage, demand
// (actuals + forecast) and performance leaderboards for admins, and each
// provider's own expected demand for their dashboard.
// ============================================================================

import { apiRequest } from '../serviceProviders/config';
import type { ApiResponse } from '../../models/serviceProviders';
import { adminApi } from './client';

/**
 * The admin endpoints go through the typed admin client (admin session,
 * refresh, the admin error envelope); this keeps the { success, data,
 * message } shape the analytics screens were written against.
 */
async function asResponse<T>(call: Promise<{ data: unknown }>): Promise<ApiResponse<T>> {
  try {
    const { data } = await call;
    return { success: true, data: data as T, message: '' };
  } catch (err: any) {
    return { success: false, data: null as unknown as T, message: err?.message || 'Request failed' };
  }
}

export type Vertical = 'homeservice' | 'healthcare' | 'shopping';

export interface RealtimeOverview {
  at: string;
  homeservice: {
    providersAvailableNow: number | null;
    liveBookings: Record<string, number> | null;
    onTheWayNow: number | null;
    inProgressNow: number | null;
    waitingForProvider: number | null;
  };
  healthcare: { appointmentsNextHour: number | null; videoCallsLive: number | null };
  shopping: { ordersLastHour: number | null; ordersToday: number | null };
  online: { accounts: number; byRole: Record<string, number>; callsInProgress: number } | null;
  api: { requestsPerMinute: number; errorRate: number; activeAccounts5m: Record<string, number> } | null;
}

export interface DemandPoint {
  date: string;
  yhat: number;
  lo: number | null;
  hi: number | null;
}

export interface DemandResponse {
  vertical: Vertical;
  segment: string;
  segments: { key: string; label: string }[];
  history: { date: string; actual: number }[];
  forecast: DemandPoint[];
  model: {
    version: string;
    method: string | null;
    source: 'real' | 'synthetic' | 'mixed';
    dataQuality: 'thin' | 'short' | 'ok' | null;
    trainedAt: string;
    metrics: { wape?: number | null; mase?: number | null; smape?: number | null; shareBeatingLastWeek?: number | null };
  } | null;
}

export interface MyDemand {
  vertical: Vertical;
  segment: string;
  label: string;
  next7: { days: number; total: number; lo: number; hi: number } | null;
  lastWeek: number;
  daily: DemandPoint[];
  model: { method: string | null; dataQuality: string | null; source: string } | null;
}

export const fetchRealtimeOverview = () => asResponse<RealtimeOverview>(adminApi.get('/api/admin/platform/realtime'));

export const fetchDemand = (vertical: Vertical, segment = 'all', days = 28) =>
  asResponse<DemandResponse>(adminApi.get('/api/admin/platform/demand', { query: { vertical, segment, days } }));

export const fetchPerformance = (module: Vertical, days = 90) =>
  asResponse<{ module: Vertical; days: number; rows: any[] }>(adminApi.get('/api/admin/platform/performance', { query: { module, days } }));

export const fetchMyDemand = () => apiRequest<MyDemand | null>('/insights/demand/mine', { bestEffort: true });

/** How a forecast method reads to a person. */
export function methodLabel(method: string | null | undefined): string {
  switch (method) {
    case 'holt_winters':
      return 'Holt-Winters (trend + weekly pattern)';
    case 'seasonal_naive':
      return 'Same weekday last week';
    case 'mean':
      return 'Recent average';
    default:
      return 'Forecast';
  }
}

// ── ML model registry ───────────────────────

export type RankingMode = 'heuristic' | 'shadow' | 'blend' | 'model';

export interface RegistryModel {
  _id: string;
  task: string;
  version: string;
  status: 'candidate' | 'active' | 'rejected' | 'archived';
  trainedOn?: { source: 'real' | 'synthetic' | 'mixed'; nReal?: number; nSynthetic?: number };
  metrics: any;
  gates?: { passed: boolean; reasons: string[] };
  activationNote?: string;
  createdAt: string;
}

export const fetchModels = (task?: string) =>
  asResponse<{ models: RegistryModel[]; serving: { matching: any; ranking: { mode: RankingMode; blendAlpha: number } } }>(
    adminApi.get('/api/admin/ml/models', { query: { task } })
  );

export const activateModel = (id: string, note?: string) =>
  asResponse(adminApi.post('/api/admin/ml/models/{id}/activate', { params: { id }, body: { note } }));

export const archiveModel = (id: string) => asResponse(adminApi.post('/api/admin/ml/models/{id}/archive', { params: { id }, body: {} }));

export const setRankingMode = (mode: RankingMode, blendAlpha?: number) =>
  asResponse(
    adminApi.patch('/api/admin/homeservice/settings', {
      body: { ranking: { mode, ...(blendAlpha !== undefined ? { blendAlpha } : {}) }, reason: `Ranking mode → ${mode}` },
    })
  );
