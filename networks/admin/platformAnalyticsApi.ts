// ============================================================================
// The analytics service (backend src/modules/analytics): live usage, demand
// (actuals + forecast) and performance leaderboards for admins, and each
// provider's own expected demand for their dashboard.
// ============================================================================

import { apiRequest } from '../serviceProviders/config';

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

export const fetchRealtimeOverview = () => apiRequest<RealtimeOverview>('/admin/platform/realtime', { bestEffort: true });

export const fetchDemand = (vertical: Vertical, segment = 'all', days = 28) =>
  apiRequest<DemandResponse>(`/admin/platform/demand?vertical=${vertical}&segment=${encodeURIComponent(segment)}&days=${days}`);

export const fetchPerformance = (module: Vertical, days = 90) =>
  apiRequest<{ module: Vertical; days: number; rows: any[] }>(`/admin/platform/performance?module=${module}&days=${days}`);

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
  apiRequest<{ models: RegistryModel[]; serving: { matching: any; ranking: { mode: RankingMode; blendAlpha: number } } }>(
    `/admin/ml/models${task ? `?task=${task}` : ''}`
  );

export const activateModel = (id: string, note?: string) =>
  apiRequest(`/admin/ml/models/${id}/activate`, { method: 'POST', body: JSON.stringify({ note }) });

export const archiveModel = (id: string) => apiRequest(`/admin/ml/models/${id}/archive`, { method: 'POST' });

export const setRankingMode = (mode: RankingMode, blendAlpha?: number) =>
  apiRequest('/admin/homeservice/settings', {
    method: 'PATCH',
    body: JSON.stringify({ ranking: { mode, ...(blendAlpha !== undefined ? { blendAlpha } : {}) }, reason: `Ranking mode → ${mode}` }),
  });
