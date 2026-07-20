// ============================================
// EARNINGS NETWORK APIs (Provider View)
// ============================================

import { EarningsData, ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

export async function fetchProviderEarnings(params?: {
  period?: 'week' | 'month' | 'year';
}): Promise<ApiResponse<EarningsData>> {
    const queryParams = new URLSearchParams({
    ...(params?.period && { period: params.period }),
  });

  return apiRequest<EarningsData>(`/provider/earnings?${queryParams}`);
}

export async function requestPayout(data: {
  amount: number;
  method: string;
  accountDetails?: Record<string, string>;
}): Promise<ApiResponse<{ payoutId: string; status: string }>> {
    return apiRequest('/provider/earnings/payout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
