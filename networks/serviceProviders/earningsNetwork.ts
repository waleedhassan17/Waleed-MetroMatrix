// ============================================
// EARNINGS NETWORK APIs (Provider View)
// ============================================

import { EarningsData, ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export async function fetchProviderEarnings(params?: {
  period?: 'week' | 'month' | 'year';
}): Promise<ApiResponse<EarningsData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      success: true,
      data: {
        stats: {
          totalEarnings: 250000,
          thisMonthEarnings: 45000,
          pendingPayouts: 8500,
          completedJobsCount: 156,
          monthlyGrowth: 12,
        },
        monthlyData: [
          { month: 'Aug', amount: 32000, jobs: 18 },
          { month: 'Sep', amount: 38000, jobs: 22 },
          { month: 'Oct', amount: 41000, jobs: 24 },
          { month: 'Nov', amount: 39000, jobs: 21 },
          { month: 'Dec', amount: 43000, jobs: 26 },
          { month: 'Jan', amount: 45000, jobs: 28 },
        ],
        recentPayments: [
          { id: '1', type: 'earning', amount: 5000, date: '2024-01-20', status: 'completed', description: 'Full House Wiring - Maria J.' },
          { id: '2', type: 'earning', amount: 1500, date: '2024-01-19', status: 'completed', description: 'Wiring Repair - Sarah M.' },
          { id: '3', type: 'payout', amount: 15000, date: '2024-01-18', status: 'completed', description: 'Weekly Payout' },
          { id: '4', type: 'earning', amount: 800, date: '2024-01-18', status: 'pending', description: 'Switch Installation - Ali K.' },
        ],
        performance: {
          avgRating: 4.9,
          onTimeRate: 96,
          statusTier: 'Gold',
          repeatCustomerRate: 34,
        },
      },
      message: 'Earnings data fetched',
    };
  }

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
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      data: {
        payoutId: `PAYOUT-${Date.now()}`,
        status: 'processing',
      },
      message: 'Payout requested',
    };
  }

  return apiRequest('/provider/earnings/payout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
